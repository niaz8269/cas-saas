<?php

namespace App\Services\Visa;

use App\Exceptions\ChecklistIncompleteException;
use App\Models\Activity;
use App\Models\Application;
use App\Models\Commission;
use App\Models\Task;
use App\Models\User;
use App\Models\VisaCase;
use App\Models\VisaStatusHistory;
use App\Services\Comms\AutomationEngine;
use App\Services\Comms\NotificationService;
use App\Services\Comms\WorkflowLog;
use App\Services\Finance\CommissionEngine;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Owns the visa case lifecycle (Technical Report §5.8):
 * not_started → documents_collection → appointment_booked → submitted
 * → approved | rejected → travel_ready.
 *
 * A case auto-opens on application acceptance with the standard China
 * student-visa checklist. Every transition is transactional, milestone-
 * stamped, and written to the immutable visa_status_history. On
 * `travel_ready` the commission advances expected → pending_arrival and
 * the counselor is tasked with pre-arrival coordination — closing the
 * loop into the M5 eligibility gate (arrival + tuition paid).
 */
class VisaWorkflow
{
    /** @var array<string, list<string>> */
    public const TRANSITIONS = [
        'not_started' => ['documents_collection'],
        'documents_collection' => ['appointment_booked'],
        'appointment_booked' => ['submitted'],
        'submitted' => ['approved', 'rejected'],
        'approved' => ['travel_ready'],
        'rejected' => ['documents_collection'], // re-application
        'travel_ready' => [],
    ];

    /**
     * Standard China student-visa (X1/X2) checklist, seeded on case open.
     *
     * @var list<array{name: string, is_required: bool}>
     */
    public const DEFAULT_CHECKLIST = [
        ['name' => 'Passport (6+ months validity)', 'is_required' => true],
        ['name' => 'Admission Letter', 'is_required' => true],
        ['name' => 'JW202 Form', 'is_required' => true],
        ['name' => 'Physical Examination Record', 'is_required' => true],
        ['name' => 'Bank Statement', 'is_required' => false],
        ['name' => 'Police Clearance', 'is_required' => false],
    ];

    /**
     * Open the visa case for an accepted application. Idempotent per
     * application. Called from ApplicationWorkflow on acceptance.
     */
    public function openCase(Application $application, User $actor): VisaCase
    {
        if ($existing = VisaCase::where('application_id', $application->id)->first()) {
            return $existing;
        }

        // Route the fresh case straight to the least-loaded visa officer so it
        // never sits ownerless after acceptance (null if none exist — a
        // global-scope officer still sees it in their queue).
        $officer = $this->pickVisaOfficer();

        return DB::transaction(function () use ($application, $actor, $officer) {
            $case = VisaCase::create([
                'application_id' => $application->id,
                'student_id' => $application->student_id,
                'assigned_visa_officer_id' => $officer?->id,
                'status' => 'not_started',
            ]);

            foreach (self::DEFAULT_CHECKLIST as $item) {
                $case->checklistItems()->create([...$item, 'status' => 'pending']);
            }

            $this->writeHistory($case, null, 'not_started', $actor, 'Case opened on application acceptance');

            Activity::create([
                'student_id' => $application->student_id,
                'user_id' => $actor->id,
                'type' => 'system',
                'body' => "Visa case opened for application {$application->application_code}",
                'meta' => ['visa_case_id' => $case->id, 'application_id' => $application->id],
                'created_at' => now(),
            ]);

            if ($officer !== null) {
                $application->loadMissing('student:id,first_name,last_name');
                app(NotificationService::class)->push(
                    $officer->id,
                    'visa.opened',
                    'New visa case assigned',
                    "A visa case opened for {$application->student?->full_name} ({$application->application_code}) and was assigned to you.",
                    entityType: 'visa_case',
                    entityId: $case->id,
                );
            }

            return $case;
        });
    }

    /**
     * The visa officer to own a fresh case: the visa.manage.global holder
     * (directly or via a role) with the fewest open (non-travel_ready)
     * cases, so work spreads evenly. Mirrors the Admissions routing. Null
     * if none exist.
     */
    private function pickVisaOfficer(): ?User
    {
        $officerIds = User::query()
            ->where(fn ($q) => $q
                ->whereHas('permissions', fn ($p) => $p->where('name', 'visa.manage.global'))
                ->orWhereHas('roles.permissions', fn ($p) => $p->where('name', 'visa.manage.global')))
            ->orderBy('id')
            ->pluck('id');

        if ($officerIds->isEmpty()) {
            return null;
        }

        $load = VisaCase::query()
            ->whereIn('assigned_visa_officer_id', $officerIds->all())
            ->where('status', '!=', 'travel_ready')
            ->selectRaw('assigned_visa_officer_id, COUNT(*) as open_count')
            ->groupBy('assigned_visa_officer_id')
            ->pluck('open_count', 'assigned_visa_officer_id');

        $chosenId = $officerIds->sortBy(fn ($id) => $load[$id] ?? 0)->first();

        return User::find($chosenId);
    }

    /**
     * @param  array{appointment_at?: string|null}  $options
     */
    public function transition(VisaCase $case, string $to, User $actor, ?string $note = null, array $options = []): VisaCase
    {
        $from = $case->status;

        if (! in_array($to, self::TRANSITIONS[$from] ?? [], true)) {
            throw new ConflictHttpException("Illegal visa transition: {$from} → {$to}.");
        }

        if ($to === 'submitted') {
            $missing = $case->checklistItems()
                ->where('is_required', true)
                ->where('status', 'pending')
                ->pluck('name');

            if ($missing->isNotEmpty()) {
                throw new ChecklistIncompleteException($missing->values()->all());
            }
        }

        return DB::transaction(function () use ($case, $from, $to, $actor, $note, $options) {
            $case->forceFill([
                'status' => $to,
                ...match ($to) {
                    'appointment_booked' => ['appointment_at' => $options['appointment_at'] ?? now()],
                    'submitted' => ['submitted_at' => now()],
                    'approved', 'rejected' => ['decision_at' => now()],
                    'travel_ready' => ['travel_ready_at' => now()],
                    default => [],
                },
            ])->save();

            $this->writeHistory($case, $from, $to, $actor, $note);
            app(WorkflowLog::class)->record('visa', $case->id, $from, $to, $actor->id);

            if (in_array($to, ['submitted', 'approved', 'rejected', 'travel_ready'], true)) {
                Activity::create([
                    'student_id' => $case->student_id,
                    'user_id' => $actor->id,
                    'type' => 'status',
                    'body' => "Visa case: {$from} → {$to}",
                    'meta' => ['visa_case_id' => $case->id],
                    'created_at' => now(),
                ]);
            }

            if ($to === 'travel_ready') {
                $this->onTravelReady($case, $actor);
            }

            $case->loadMissing('student:id,assigned_counselor_id');
            app(AutomationEngine::class)->dispatch('visa.status', [
                'to' => $to,
                'from' => $from,
                'student_id' => $case->student_id,
                'counselor_id' => $case->student?->assigned_counselor_id,
            ]);

            return $case->refresh();
        });
    }

    /**
     * Travel-ready side-effects: the commission moves into the arrival
     * window (expected → pending_arrival) and the counselor gets a
     * pre-arrival task — marking the student `arrived` plus tuition paid
     * then unlocks commission eligibility (report §5.6).
     */
    private function onTravelReady(VisaCase $case, User $actor): void
    {
        $commission = Commission::where('application_id', $case->application_id)->first();

        if ($commission?->status === 'expected') {
            app(CommissionEngine::class)->transition(
                $commission, 'pending_arrival', $actor,
                ['note' => 'Visa travel-ready'],
            );
        }

        $case->loadMissing('student:id,first_name,last_name,assigned_counselor_id');
        $student = $case->student;

        if ($student?->assigned_counselor_id) {
            Task::create([
                'title' => "Pre-arrival coordination for {$student->full_name}",
                'assignee_id' => $student->assigned_counselor_id,
                'student_id' => $student->id,
                'related_type' => VisaCase::class,
                'related_id' => $case->id,
                'due_at' => now()->addDays(7),
                'priority' => 'high',
                'status' => 'open',
                'created_by' => $actor->id,
            ]);
        }
    }

    private function writeHistory(VisaCase $case, ?string $from, string $to, User $actor, ?string $note = null): void
    {
        VisaStatusHistory::create([
            'visa_case_id' => $case->id,
            'from_status' => $from,
            'to_status' => $to,
            'changed_by' => $actor->id,
            'note' => $note,
            'created_at' => now(),
        ]);
    }
}

<?php

namespace App\Services\Admissions;

use App\Exceptions\ChecklistIncompleteException;
use App\Models\Activity;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\DocumentType;
use App\Models\User;
use App\Services\Comms\AutomationEngine;
use App\Services\Comms\NotificationService;
use App\Services\Comms\WorkflowLog;
use App\Services\Finance\CommissionEngine;
use App\Services\Visa\VisaWorkflow;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Owns the application lifecycle (Technical Report §5.4): every state
 * change is guarded, transactional, and written to the immutable
 * application_status_history.
 */
class ApplicationWorkflow
{
    /** @var array<string, list<string>> */
    public const TRANSITIONS = [
        'draft' => ['under_review', 'withdrawn'],
        'under_review' => ['documents_pending', 'submitted', 'withdrawn'],
        'documents_pending' => ['under_review', 'submitted', 'withdrawn'],
        'submitted' => ['offer_received', 'rejected', 'withdrawn'],
        'offer_received' => ['accepted', 'rejected', 'deferred', 'withdrawn'],
        'deferred' => ['under_review', 'withdrawn'],
        'accepted' => [],
        'rejected' => [],
        'withdrawn' => [],
    ];

    /**
     * @param  array<string, mixed>  $data
     *
     * $actor is null for portal-initiated creates (student/agent self-apply),
     * mirroring portal document uploads — audit columns simply stay unset.
     */
    public function create(array $data, ?User $actor): Application
    {
        return DB::transaction(function () use ($data, $actor) {
            $application = Application::create([
                ...$data,
                'application_code' => $this->nextCode(),
                'status' => 'draft',
                'created_by' => $actor?->id,
            ]);

            ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'from_status' => null,
                'to_status' => 'draft',
                'changed_by' => $actor?->id,
                'created_at' => now(),
            ]);

            $application->load(['university:id,name', 'program:id,name', 'scholarship:id,name']);

            $target = $application->program
                ? "{$application->program->name} at {$application->university->name}"
                : ($application->scholarship?->name ?? 'general application');

            Activity::create([
                'student_id' => $application->student_id,
                'user_id' => $actor?->id,
                'type' => 'system',
                'body' => "Application {$application->application_code} created — {$target}",
                'meta' => ['application_id' => $application->id],
                'created_at' => now(),
            ]);

            return $application;
        });
    }

    public function transition(Application $application, string $to, ?User $actor, ?string $note = null): Application
    {
        $from = $application->status;
        $allowed = self::TRANSITIONS[$from] ?? [];

        if (! in_array($to, $allowed, true)) {
            throw new ConflictHttpException("Illegal transition: {$from} → {$to}.");
        }

        if ($to === 'submitted') {
            $missing = $this->missingChecklist($application);

            if ($missing->isNotEmpty()) {
                throw new ChecklistIncompleteException($missing->values()->all());
            }
        }

        return DB::transaction(function () use ($application, $from, $to, $actor, $note) {
            $application->forceFill([
                'status' => $to,
                'updated_by' => $actor?->id,
                ...($to === 'submitted' ? ['submitted_at' => now()] : []),
            ])->save();

            ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'from_status' => $from,
                'to_status' => $to,
                'changed_by' => $actor?->id,
                'note' => $note,
                'created_at' => now(),
            ]);

            app(WorkflowLog::class)->record('application', $application->id, $from, $to, $actor?->id);

            if (in_array($to, ['submitted', 'offer_received', 'accepted', 'rejected'], true)) {
                Activity::create([
                    'student_id' => $application->student_id,
                    'user_id' => $actor?->id,
                    'type' => 'status',
                    'body' => "Application {$application->application_code}: {$from} → {$to}",
                    'meta' => ['application_id' => $application->id],
                    'created_at' => now(),
                ]);
            }

            // Milestone results ping the student's counselor's bell (§5.9).
            if (in_array($to, ['offer_received', 'accepted', 'rejected'], true)) {
                $application->loadMissing('student:id,first_name,last_name,assigned_counselor_id');
                app(NotificationService::class)->push(
                    $application->student?->assigned_counselor_id,
                    "application.{$to}",
                    "Application {$to}: {$application->student?->full_name}",
                    "{$application->application_code} is now {$to}.",
                    entityType: 'application',
                    entityId: $application->id,
                );
            }

            if ($to === 'accepted') {
                // Acceptance opens the money trail: first-year tuition
                // invoice + expected commission (report §5.4/§5.6) —
                // and hands over to visa with a fresh case (§5.8).
                app(CommissionEngine::class)
                    ->onApplicationAccepted($application, $actor);
                app(VisaWorkflow::class)
                    ->openCase($application, $actor);
            }

            // Declarative automations react to the same transition (§5.9).
            // After the accept block so it never front-loads a partial
            // `program` relation (tuition_fee must stay readable there).
            $application->loadMissing(['student', 'program', 'university']);
            app(AutomationEngine::class)->dispatch('application.status', [
                'to' => $to,
                'from' => $from,
                'student_id' => $application->student_id,
                'counselor_id' => $application->student?->assigned_counselor_id,
                'program' => $application->program?->name,
                'university' => $application->university?->name,
            ]);

            return $application->refresh();
        });
    }

    /**
     * Required-for-application document types not yet covered by a
     * non-rejected document on this application.
     *
     * @return Collection<int, string>
     */
    public function missingChecklist(Application $application): Collection
    {
        $required = DocumentType::requiredFor('application')->pluck('name', 'id');

        if ($required->isEmpty()) {
            return collect();
        }

        $coveredTypeIds = $application->documents()
            ->where('status', '!=', 'rejected')
            ->pluck('document_type_id')
            ->filter()
            ->unique();

        return $required
            ->reject(fn ($name, $id) => $coveredTypeIds->contains($id))
            ->values();
    }

    private function nextCode(): string
    {
        $year = now()->year;
        $sequence = Application::withTrashed()->count() + 1;

        do {
            $code = sprintf('APP-%d-%05d', $year, $sequence);
            $sequence++;
        } while (Application::withTrashed()->where('application_code', $code)->exists());

        return $code;
    }
}

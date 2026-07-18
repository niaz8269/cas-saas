<?php

namespace App\Services\Admissions;

use App\Models\Application;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\Student;
use App\Models\User;
use App\Services\Comms\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The portal application-submission write path (student self-apply and,
 * later, agent on-behalf). Saves the applicant's profile, creates a draft
 * application with no staff actor, and hands a completed draft to CAS by
 * transitioning draft → under_review once the per-program document
 * checklist is satisfied.
 */
class PortalApplicationService
{
    /** The role whose members verify and process incoming applications. */
    private const ADMISSIONS_ROLE = 'Admissions';

    public function __construct(
        private readonly ApplicationWorkflow $workflow,
        private readonly ApplicationCatalog $catalog,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * Create a draft application for a student, persisting the wizard's
     * profile / guardian / education data onto their record.
     *
     * @param  array<string, mixed>  $data  validated payload
     */
    public function createDraft(Student $student, array $data): Application
    {
        $program = Program::where('status', 'active')->findOrFail($data['program_id']);

        $scholarship = $this->resolveScholarship($program, $data);
        $intakeId = $this->resolveIntakeId($program, $data['intake_id'] ?? null);

        return DB::transaction(function () use ($student, $data, $program, $scholarship, $intakeId) {
            if (! empty($data['profile'])) {
                $student->fill($data['profile'])->save();
            }

            if (array_key_exists('guardians', $data)) {
                $student->guardians()->delete();
                foreach ($data['guardians'] as $guardian) {
                    $student->guardians()->create($guardian);
                }
            }

            if (array_key_exists('education', $data)) {
                $student->education()->delete();
                foreach ($data['education'] as $entry) {
                    $student->education()->create($entry);
                }
            }

            return $this->workflow->create([
                'student_id' => $student->id,
                'university_id' => $program->university_id,
                'program_id' => $program->id,
                'scholarship_id' => $scholarship?->id,
                'intake_id' => $intakeId,
                'agent_id' => $student->agent_id,
            ], null);
        });
    }

    /**
     * Hand a draft to CAS. Blocks unless every required document (resolved
     * for the chosen program + scholarship) has a non-rejected upload, then
     * routes it straight to the Admissions department: an officer is assigned
     * (so it enters their queue) and notified to verify and process it.
     */
    public function submit(Application $application): Application
    {
        abort_unless($application->status === 'draft', 409, 'Only a draft application can be submitted.');

        $application->loadMissing('program', 'scholarship');

        $required = $this->catalog->requiredDocuments($application->program, $application->scholarship);

        $covered = $application->documents()
            ->where('status', '!=', 'rejected')
            ->pluck('document_type_id')
            ->filter()
            ->unique();

        $missing = $required->reject(fn ($type) => $covered->contains($type->id));

        if ($missing->isNotEmpty()) {
            throw ValidationException::withMessages([
                'documents' => 'Please upload: '.$missing->pluck('name')->implode(', ').'.',
            ]);
        }

        $officer = $this->pickAdmissionsOfficer();

        if ($officer !== null) {
            $application->forceFill(['assigned_admissions_id' => $officer->id])->save();
        }

        $submitted = $this->workflow->transition(
            $application,
            'under_review',
            null,
            'Submitted via portal — routed to Admissions.',
        );

        if ($officer !== null) {
            $this->notifications->push(
                $officer->id,
                'application.submitted',
                'New application to verify',
                "{$submitted->application_code} was submitted and assigned to you for verification.",
                entityType: 'application',
                entityId: $submitted->id,
            );
        }

        return $submitted;
    }

    /**
     * The Admissions officer to route a new application to: the one with the
     * fewest open applications, so work spreads evenly. Null if none exist
     * (the application still enters under_review for global-scope staff).
     */
    private function pickAdmissionsOfficer(): ?User
    {
        // whereHas (not the spatie role() scope) so a missing role yields an
        // empty set instead of throwing.
        $officerIds = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', self::ADMISSIONS_ROLE))
            ->orderBy('id')
            ->pluck('id');

        if ($officerIds->isEmpty()) {
            return null;
        }

        $load = Application::query()
            ->whereIn('assigned_admissions_id', $officerIds->all())
            ->whereNotIn('status', ['accepted', 'rejected', 'withdrawn'])
            ->selectRaw('assigned_admissions_id, COUNT(*) as open_count')
            ->groupBy('assigned_admissions_id')
            ->pluck('open_count', 'assigned_admissions_id');

        $chosenId = $officerIds->sortBy(fn ($id) => $load[$id] ?? 0)->first();

        return User::find($chosenId);
    }

    /**
     * The scholarship to attach: only in a funded mode, and it must belong
     * to the chosen program's university.
     *
     * @param  array<string, mixed>  $data
     */
    private function resolveScholarship(Program $program, array $data): ?Scholarship
    {
        if (($data['funding'] ?? 'self') === 'self' || empty($data['scholarship_id'])) {
            return null;
        }

        $scholarship = Scholarship::findOrFail($data['scholarship_id']);

        if ($scholarship->university_id !== $program->university_id) {
            throw ValidationException::withMessages([
                'scholarship_id' => 'That scholarship is not offered by the selected university.',
            ]);
        }

        return $scholarship;
    }

    /** An intake must belong to the program or its university. */
    private function resolveIntakeId(Program $program, ?int $intakeId): ?int
    {
        if (empty($intakeId)) {
            return null;
        }

        $valid = $program->intakes()->whereKey($intakeId)->exists()
            || $program->university->intakes()->whereKey($intakeId)->exists();

        if (! $valid) {
            throw ValidationException::withMessages([
                'intake_id' => 'That intake is not available for the selected program.',
            ]);
        }

        return $intakeId;
    }
}

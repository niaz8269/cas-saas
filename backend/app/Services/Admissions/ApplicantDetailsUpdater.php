<?php

namespace App\Services\Admissions;

use App\Models\Activity;
use App\Models\Application;
use App\Models\Student;
use App\Models\User;
use App\Services\Comms\NotificationService;
use App\Services\Leads\DuplicateDetector;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

/**
 * A student, or the partner who added them, correcting or completing the applicant record (profile, family, prior
 * education) after an application has gone in. Allowed until an application of theirs is accepted; the officers
 * handling their open applications are told, and a system entry lands on the student's timeline.
 */
class ApplicantDetailsUpdater
{
    public function __construct(
        private readonly ApplicantDataWriter $writer,
        private readonly DuplicateDetector $detector,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * @param  array<string, mixed>  $data  validated profile / guardians / education
     * @param  string  $by  who made the change, for the timeline ("the student", "partner Name (AGT-1)")
     */
    public function update(Student $student, array $data, string $by): void
    {
        if ($student->applications()->where('status', 'accepted')->exists()) {
            $this->refuse('These details are locked because an application was accepted. Contact CAS to change them.', 409, 'LOCKED');
        }

        $profile = $data['profile'] ?? [];

        // Phone and passport are written in their normal form, and must not match somebody else already at CAS.
        $phone = $this->detector->normalizePhone($profile['phone'] ?? null);
        $passport = $this->detector->normalizePassport($profile['passport_no'] ?? null);

        $other = $this->detector->findExactStudent(null, $phone, $passport);
        if ($other !== null && $other->id !== $student->id) {
            $this->refuse('These details match another student already at CAS. Contact your CAS coordinator.', 409, 'DUPLICATE');
        }

        if ($profile !== []) {
            $data['profile'] = array_filter(
                [...$profile, 'phone' => $phone, 'passport_no' => $passport],
                fn ($value) => $value !== null,
            );
        }

        DB::transaction(function () use ($student, $data, $by) {
            $this->writer->write($student, $data);

            Activity::create([
                'student_id' => $student->id,
                'user_id' => null, // portal action — no staff actor
                'type' => 'system',
                'body' => "Applicant details updated by {$by}",
                'meta' => ['source' => 'portal'],
                'created_at' => now(),
            ]);
        });

        $this->tellOfficers($student, "{$student->full_name}'s details were updated by {$by}.", 'applicant.updated', 'Applicant details updated');
    }

    /** A request to change something the applicant cannot change alone (the program or the funding). */
    public function requestChange(Application $application, string $message, string $by): void
    {
        $application->loadMissing('student');

        Activity::create([
            'student_id' => $application->student_id,
            'user_id' => null,
            'type' => 'system',
            'body' => "Change requested on {$application->application_code} by {$by}: {$message}",
            'meta' => ['application_id' => $application->id, 'kind' => 'change_request'],
            'created_at' => now(),
        ]);

        $officers = $application->assigned_admissions_id !== null
            ? collect([$application->assigned_admissions_id])
            : User::role('Admin')->pluck('id');

        foreach ($officers as $officerId) {
            $this->notifications->push(
                $officerId,
                'application.change_requested',
                'Change requested',
                "{$application->application_code}: {$by} asks: {$message}",
                entityType: 'application',
                entityId: $application->id,
            );
        }
    }

    private function tellOfficers(Student $student, string $body, string $type, string $title): void
    {
        $officerIds = Application::query()
            ->where('student_id', $student->id)
            ->whereIn('status', ['under_review', 'documents_pending', 'submitted', 'offer_received'])
            ->whereNotNull('assigned_admissions_id')
            ->distinct()
            ->pluck('assigned_admissions_id');

        foreach ($officerIds as $officerId) {
            $this->notifications->push($officerId, $type, $title, $body, entityType: 'student', entityId: $student->id);
        }
    }

    private function refuse(string $message, int $status, string $code): never
    {
        throw new HttpResponseException(response()->json(['message' => $message, 'code' => $code], $status));
    }
}

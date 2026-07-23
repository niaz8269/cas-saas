<?php

namespace App\Services\Comms;

use App\Models\Application;

/**
 * Applicant-facing in-app notifications: the student (and, when the
 * application was filed on their behalf, the filing agent) get a bell entry
 * for the milestones that matter to them. Runs alongside the templated
 * emails (AutomationEngine) — the feed is the durable, always-on channel.
 */
class PortalNotifier
{
    /** Human labels for the application statuses worth surfacing to the applicant. */
    private const APPLICATION_LABELS = [
        'submitted' => 'was submitted to the university',
        'documents_pending' => 'needs additional documents',
        'offer_received' => 'received an offer',
        'accepted' => 'was accepted',
        'rejected' => 'was not successful',
    ];

    public function __construct(private readonly NotificationService $notifications) {}

    /** Notify the student + filing agent of an application milestone. */
    public function application(Application $application, string $status): void
    {
        $label = self::APPLICATION_LABELS[$status] ?? null;

        if ($label === null) {
            return;
        }

        $this->toApplicant(
            $application,
            "application.{$status}",
            'Application update',
            "Your application {$application->application_code} {$label}.",
            'application',
            $application->id,
        );
    }

    /** Notify the student that a document was rejected (must re-upload) or verified. */
    public function document(int $studentId, string $status, ?string $documentName): void
    {
        $doc = $documentName ?? 'a document';

        [$title, $body] = match ($status) {
            'rejected' => ['Document needs re-uploading', "Your {$doc} could not be accepted — please upload a new copy."],
            'verified' => ['Document verified', "Your {$doc} has been verified."],
            default => [null, null],
        };

        if ($title === null) {
            return;
        }

        $this->notifications->pushToStudent($studentId, "document.{$status}", $title, $body, 'student', $studentId);
    }

    /** Notify the student + filing agent of a visa decision. */
    public function visa(Application $application, string $status): void
    {
        [$title, $body] = match ($status) {
            'approved' => ['Visa approved', 'Your student visa has been approved — travel coordination will follow.'],
            'rejected' => ['Visa update', 'Your visa was not approved this time; your counselor will prepare a re-application.'],
            default => [null, null],
        };

        if ($title === null) {
            return;
        }

        $this->toApplicant($application, "visa.{$status}", $title, $body, 'application', $application->id);
    }

    private function toApplicant(Application $application, string $type, string $title, string $body, string $entityType, int $entityId): void
    {
        $this->notifications->pushToStudent($application->student_id, $type, $title, $body, $entityType, $entityId);

        if ($application->agent_id) {
            $this->notifications->pushToAgent($application->agent_id, $type, $title, $body, $entityType, $entityId);
        }
    }
}

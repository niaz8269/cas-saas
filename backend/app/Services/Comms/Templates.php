<?php

namespace App\Services\Comms;

use App\Models\Student;

/**
 * Named message templates (report §5.9 "templated messaging"). Each
 * renders a subject + body from the student and a small data bag using
 * {placeholder} substitution. `custom` passes the caller's own body
 * through for ad-hoc messages.
 */
class Templates
{
    /** @var array<string, array{subject: string, body: string}> */
    public const TEMPLATES = [
        'welcome' => [
            'subject' => 'Welcome to CAS Education',
            'body' => "Dear {first_name},\n\nWelcome to CAS — Consultancy for Abroad Study. Your student ID is {student_code}. Your counselor will be in touch shortly.\n\nCAS Education",
        ],
        'offer_received' => [
            'subject' => 'Congratulations — your offer has arrived',
            'body' => "Dear {first_name},\n\nGreat news! An offer has been issued for {program} at {university}. Please review the next steps with your counselor.\n\nCAS Education",
        ],
        'offer_accepted' => [
            'subject' => 'Your admission is confirmed',
            'body' => "Dear {first_name},\n\nWe've confirmed your acceptance of the offer for {program} at {university}. Your first-year tuition invoice and visa case are being prepared — your counselor will guide you through the next steps.\n\nCAS Education",
        ],
        'application_submitted' => [
            'subject' => 'Your application has been submitted',
            'body' => "Dear {first_name},\n\nYour application for {program} at {university} has been submitted to the university. We'll let you know as soon as there's an update.\n\nCAS Education",
        ],
        'application_rejected' => [
            'subject' => 'An update on your application',
            'body' => "Dear {first_name},\n\nUnfortunately your application for {program} at {university} was not successful this time. Your counselor will reach out to discuss the alternatives available to you.\n\nCAS Education",
        ],
        'documents_requested' => [
            'subject' => 'Action needed: documents for your application',
            'body' => "Dear {first_name},\n\nWe need some documents to continue processing your application for {program} at {university}. Please sign in to your CAS portal and upload the requested items.\n\nCAS Education",
        ],
        'document_rejected' => [
            'subject' => 'Action needed: please re-upload a document',
            'body' => "Dear {first_name},\n\nOne of your documents ({document}) could not be accepted and needs to be re-uploaded. Please sign in to your CAS portal, remove the previous file, and upload a clear, valid copy.\n\nCAS Education",
        ],
        'document_verified' => [
            'subject' => 'A document has been verified',
            'body' => "Dear {first_name},\n\nGood news — your {document} has been verified. No further action is needed for this item.\n\nCAS Education",
        ],
        'visa_approved' => [
            'subject' => 'Your visa has been approved',
            'body' => "Dear {first_name},\n\nYour student visa has been approved. We will now coordinate your pre-arrival and travel plans.\n\nCAS Education",
        ],
        'visa_rejected' => [
            'subject' => 'An update on your visa application',
            'body' => "Dear {first_name},\n\nYour visa application was not approved. Don't worry — a re-application is possible. Your counselor will contact you to prepare the next submission.\n\nCAS Education",
        ],
        'payment_reminder' => [
            'subject' => 'Reminder: outstanding tuition balance',
            'body' => "Dear {first_name},\n\nThis is a friendly reminder that a balance remains on your first-year tuition invoice. Please contact us to arrange payment.\n\nCAS Education",
        ],
        'custom' => [
            'subject' => 'A message from CAS Education',
            'body' => '{body}',
        ],
    ];

    /**
     * @param  array<string, mixed>  $data
     * @return array{subject: string, body: string}
     */
    public function render(string $template, Student $student, array $data = []): array
    {
        $tpl = self::TEMPLATES[$template] ?? self::TEMPLATES['custom'];

        $replacements = [
            '{first_name}' => $student->first_name,
            '{full_name}' => $student->full_name,
            '{student_code}' => $student->student_code,
            '{program}' => $data['program'] ?? 'your program',
            '{university}' => $data['university'] ?? 'your university',
            '{document}' => $data['document'] ?? 'a document',
            '{body}' => $data['body'] ?? '',
        ];

        return [
            'subject' => strtr($tpl['subject'], $replacements),
            'body' => strtr($tpl['body'], $replacements),
        ];
    }
}

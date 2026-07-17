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
            'body' => "Dear {first_name},\n\nGreat news! An offer has been issued for {course} at {university}. Please review the next steps with your counselor.\n\nCAS Education",
        ],
        'visa_approved' => [
            'subject' => 'Your visa has been approved',
            'body' => "Dear {first_name},\n\nYour student visa has been approved. We will now coordinate your pre-arrival and travel plans.\n\nCAS Education",
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
            '{course}' => $data['course'] ?? 'your program',
            '{university}' => $data['university'] ?? 'your university',
            '{body}' => $data['body'] ?? '',
        ];

        return [
            'subject' => strtr($tpl['subject'], $replacements),
            'body' => strtr($tpl['body'], $replacements),
        ];
    }
}

<?php

namespace App\Mail;

use App\Models\Student;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Sent on student self-signup: a time-limited signed link to confirm the
 * email address before it is trusted for account recovery / notices.
 */
class VerifyStudentEmail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Student $student,
        public readonly string $verifyUrl,
    ) {}

    public function build(): self
    {
        $name = e($this->student->first_name);
        $url = e($this->verifyUrl);

        return $this->subject('Verify your CAS email address')
            ->html(
                "<p>Dear {$name},</p>"
                .'<p>Thanks for creating your CAS student account. Please confirm this email address by clicking the button below (the link expires in 60 minutes).</p>'
                ."<p><a href=\"{$url}\" style=\"display:inline-block;background:#14357C;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none\">Verify email</a></p>"
                ."<p>If the button doesn't work, copy this link into your browser:<br><a href=\"{$url}\">{$url}</a></p>"
                .'<p>If you didn\'t create this account, you can ignore this email.</p>'
                .'<p>— CAS Education</p>',
            );
    }
}

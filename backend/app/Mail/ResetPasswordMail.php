<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** A time-limited link to choose a new password. */
class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $name,
        public readonly string $resetUrl,
        public readonly int $minutes,
    ) {}

    public function build(): self
    {
        $name = e($this->name);
        $url = e($this->resetUrl);

        return $this->subject('Reset your CAS password')
            ->html(
                "<p>Dear {$name},</p>"
                ."<p>We received a request to reset the password for your CAS account. Use the button below to choose a new one (the link expires in {$this->minutes} minutes and works once).</p>"
                ."<p><a href=\"{$url}\" style=\"display:inline-block;background:#14357C;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none\">Choose a new password</a></p>"
                ."<p>If the button doesn't work, copy this link into your browser:<br><a href=\"{$url}\">{$url}</a></p>"
                .'<p>If you did not ask for this, you can ignore this email: your password stays as it is.</p>'
                .'<p>— CAS Education</p>',
            );
    }
}

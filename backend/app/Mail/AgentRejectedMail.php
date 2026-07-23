<?php

namespace App\Mail;

use App\Models\Agent;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to an agent/partner when an admin rejects their sign-up request.
 */
class AgentRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Agent $agent) {}

    public function build(): self
    {
        $name = e($this->agent->contact_name ?: $this->agent->name);
        $company = e($this->agent->name);

        return $this->subject('Update on your CAS partner application')
            ->html(
                "<p>Dear {$name},</p>"
                .'<p>Thank you for your interest in partnering with CAS.</p>'
                ."<p>After reviewing your application for <strong>{$company}</strong>, we're unable to approve it at this time.</p>"
                ."<p>If you'd like more information, please get in touch with our team.</p>"
                .'<p>— CAS Education</p>',
            );
    }
}

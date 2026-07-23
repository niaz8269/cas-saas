<?php

namespace App\Mail;

use App\Models\Agent;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to an agent/partner when an admin approves their sign-up request —
 * they can now sign in to the partner portal.
 */
class AgentApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Agent $agent) {}

    public function build(): self
    {
        $name = e($this->agent->contact_name ?: $this->agent->name);
        $company = e($this->agent->name);

        return $this->subject('Your CAS partner application is approved')
            ->html(
                "<p>Dear {$name},</p>"
                ."<p>Good news — your partner application for <strong>{$company}</strong> has been approved.</p>"
                .'<p>You can now sign in to the CAS partner portal using the email address you registered with.</p>'
                .'<p>Welcome to the CAS partner network.</p>'
                .'<p>— CAS Education</p>',
            );
    }
}

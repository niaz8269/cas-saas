<?php

namespace App\Services\Comms\Channels;

use App\Models\Communication;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Email channel — SMTP to Mailpit locally, a real provider (SES/SMTP) in
 * production via MAIL_* env. Credentials never live in code.
 */
class EmailDriver implements ChannelDriver
{
    public function send(Communication $communication, ?string $subject): array
    {
        $email = $communication->student?->email;

        if (! $email) {
            return ['provider' => 'mail', 'provider_msg_id' => null, 'status' => 'failed', 'error' => 'No email address on file.'];
        }

        Mail::raw($communication->body ?? '', function ($message) use ($email, $subject) {
            $message->to($email)->subject($subject ?? 'A message from CAS Education');
        });

        return ['provider' => 'mail', 'provider_msg_id' => (string) Str::uuid(), 'status' => 'sent', 'error' => null];
    }
}

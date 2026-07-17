<?php

namespace App\Services\Comms\Channels;

use App\Models\Communication;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Placeholder channel for WhatsApp/SMS/in-app: records the send to the log
 * so the flow is demoable without external providers. Swap for the Meta
 * WhatsApp Cloud API / Twilio drivers when credentials are configured.
 */
class LogDriver implements ChannelDriver
{
    public function send(Communication $communication, ?string $subject): array
    {
        Log::info('Communication dispatched (log driver)', [
            'communication_id' => $communication->id,
            'channel' => $communication->channel,
            'student_id' => $communication->student_id,
        ]);

        return ['provider' => 'log', 'provider_msg_id' => (string) Str::uuid(), 'status' => 'sent', 'error' => null];
    }
}

<?php

namespace App\Jobs;

use App\Models\Activity;
use App\Models\Communication;
use App\Models\MessageLog;
use App\Services\Comms\ChannelManager;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;

/**
 * Delivers a queued communication through its channel driver, records the
 * provider result to message_logs, and mirrors the send onto the student
 * timeline (report §5.9: "all outbound comms logged to the student
 * timeline"). Queued so provider latency never blocks the request.
 */
class SendCommunication implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $communicationId,
        public readonly ?string $subject = null,
    ) {}

    public function handle(ChannelManager $channels): void
    {
        $communication = Communication::with('student')->find($this->communicationId);

        if ($communication === null) {
            return;
        }

        $result = $channels->for($communication->channel)->send($communication, $this->subject);

        $communication->update(['status' => $result['status']]);

        MessageLog::create([
            'communication_id' => $communication->id,
            'provider' => $result['provider'],
            'provider_msg_id' => $result['provider_msg_id'],
            'status' => $result['status'],
            'error' => $result['error'],
            'created_at' => now(),
        ]);

        if ($communication->student_id !== null) {
            Activity::create([
                'student_id' => $communication->student_id,
                'user_id' => $communication->sent_by,
                'type' => $communication->channel === 'email' ? 'email' : 'note',
                'body' => '['.Str::title($communication->channel).'] '.Str::limit((string) $communication->body, 180),
                'meta' => [
                    'communication_id' => $communication->id,
                    'template' => $communication->template,
                    'status' => $result['status'],
                ],
                'created_at' => now(),
            ]);
        }
    }
}

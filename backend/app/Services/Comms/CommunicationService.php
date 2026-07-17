<?php

namespace App\Services\Comms;

use App\Jobs\SendCommunication;
use App\Models\Communication;
use App\Models\Student;

/**
 * Renders a template and queues an outbound message against a student.
 * The Communication row is the durable record (status queued → sent);
 * SendCommunication does the delivery, logging and timeline mirror.
 */
class CommunicationService
{
    public function __construct(private readonly Templates $templates) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function queue(Student $student, string $channel, string $template, array $data, ?int $actorId): Communication
    {
        ['subject' => $subject, 'body' => $body] = $this->templates->render($template, $student, $data);

        $communication = Communication::create([
            'student_id' => $student->id,
            'channel' => $channel,
            'direction' => 'out',
            'template' => $template,
            'body' => $body,
            'status' => 'queued',
            'sent_by' => $actorId,
            'created_at' => now(),
        ]);

        SendCommunication::dispatch($communication->id, $subject);

        return $communication;
    }
}

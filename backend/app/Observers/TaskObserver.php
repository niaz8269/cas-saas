<?php

namespace App\Observers;

use App\Models\Task;
use App\Services\Comms\NotificationService;

/**
 * Every assigned task raises an in-app notification for its owner — the
 * "auto-create next-owner task on transition" loop (report §5.9) surfaces
 * in the assignee's bell without each caller wiring it by hand.
 */
class TaskObserver
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function created(Task $task): void
    {
        if ($task->assignee_id === null) {
            return;
        }

        $this->notifications->push(
            $task->assignee_id,
            'task.assigned',
            $task->title,
            $task->due_at ? 'Due '.$task->due_at->diffForHumans() : null,
            entityType: $task->student_id ? 'student' : null,
            entityId: $task->student_id,
        );
    }
}

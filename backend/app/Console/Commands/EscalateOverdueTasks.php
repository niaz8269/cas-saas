<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Services\Comms\NotificationService;
use Illuminate\Console\Command;

/**
 * SLA enforcement (report §5.9): open tasks past their due date are
 * escalated once — stamped, bumped to high priority, and the assignee is
 * notified. Scheduled hourly. Idempotent: a task already escalated is
 * skipped, so it never re-fires.
 */
class EscalateOverdueTasks extends Command
{
    protected $signature = 'app:escalate-overdue-tasks';

    protected $description = 'Escalate open tasks past their SLA due date';

    public function handle(NotificationService $notifications): int
    {
        $count = 0;

        // chunkById (not chunk): we mutate escalated_at — the filtered column —
        // inside the loop, so paginate by primary key to avoid skipping rows,
        // and keep memory flat no matter how large the backlog.
        Task::query()
            ->whereIn('status', ['open', 'in_progress'])
            ->whereNotNull('due_at')
            ->where('due_at', '<', now())
            ->whereNull('escalated_at')
            ->chunkById(200, function ($tasks) use ($notifications, &$count): void {
                foreach ($tasks as $task) {
                    $task->forceFill([
                        'escalated_at' => now(),
                        'priority' => 'high',
                    ])->save();

                    $notifications->push(
                        $task->assignee_id,
                        'task.escalated',
                        "Overdue: {$task->title}",
                        'This task passed its due date and has been escalated.',
                        entityType: $task->student_id ? 'student' : null,
                        entityId: $task->student_id,
                    );
                    $count++;
                }
            });

        $this->info("Escalated {$count} overdue task(s).");

        return self::SUCCESS;
    }
}

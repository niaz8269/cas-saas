<?php

namespace App\Services\Comms;

use App\Models\AutomationRule;
use App\Models\Student;

/**
 * Declarative automation (report §5.9). On a domain event, active rules
 * whose trigger matches and whose conditions hold run their actions
 * (send a templated communication, raise a notification). Rules are pure
 * data — new automations need no code.
 *
 * trigger_def: {"event": "application.status", "to": "offer_received"}
 * conditions:  {"field": expected, ...}   (all must equal the context)
 * actions:     [{"type": "communication", "channel": "email",
 *                "template": "offer_received", "target": "student"}, ...]
 */
class AutomationEngine
{
    public function __construct(
        private readonly CommunicationService $communications,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * @param  array<string, mixed>  $context
     */
    public function dispatch(string $event, array $context): void
    {
        $rules = AutomationRule::query()->where('is_active', true)->get();

        foreach ($rules as $rule) {
            if ($this->triggerMatches($rule, $event, $context) && $this->conditionsMatch($rule, $context)) {
                $this->runActions($rule, $context);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function triggerMatches(AutomationRule $rule, string $event, array $context): bool
    {
        $trigger = $rule->trigger_def ?? [];

        if (($trigger['event'] ?? null) !== $event) {
            return false;
        }

        // Optional `to` narrows the trigger to a specific target state.
        return ! isset($trigger['to']) || ($context['to'] ?? null) === $trigger['to'];
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function conditionsMatch(AutomationRule $rule, array $context): bool
    {
        foreach (($rule->conditions ?? []) as $field => $expected) {
            if (($context[$field] ?? null) !== $expected) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function runActions(AutomationRule $rule, array $context): void
    {
        foreach (($rule->actions ?? []) as $action) {
            match ($action['type'] ?? null) {
                'communication' => $this->sendCommunication($action, $context),
                'notify' => $this->notify($action, $context),
                default => null,
            };
        }
    }

    /**
     * @param  array<string, mixed>  $action
     * @param  array<string, mixed>  $context
     */
    private function sendCommunication(array $action, array $context): void
    {
        $student = ($action['target'] ?? 'student') === 'student' && isset($context['student_id'])
            ? Student::find($context['student_id'])
            : null;

        if ($student === null) {
            return;
        }

        $this->communications->queue(
            $student,
            $action['channel'] ?? 'email',
            $action['template'] ?? 'custom',
            [
                'program' => $context['program'] ?? null,
                'university' => $context['university'] ?? null,
                'document' => $context['document'] ?? null,
                'body' => $action['body'] ?? null,
            ],
            null, // system actor
        );
    }

    /**
     * @param  array<string, mixed>  $action
     * @param  array<string, mixed>  $context
     */
    private function notify(array $action, array $context): void
    {
        $target = $action['target'] ?? 'counselor';

        $this->notifications->push(
            $context["{$target}_id"] ?? null,
            $action['notification_type'] ?? 'automation',
            $action['title'] ?? 'Update',
            $action['body'] ?? null,
            entityType: isset($context['student_id']) ? 'student' : null,
            entityId: $context['student_id'] ?? null,
        );
    }
}

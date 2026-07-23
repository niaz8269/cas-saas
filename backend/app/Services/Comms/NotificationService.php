<?php

namespace App\Services\Comms;

use App\Models\Notification;
use App\Models\User;

/**
 * Raises in-app notifications for staff users (report §5.9 / §7.2).
 * Channels default to in-app; other channels (email/WhatsApp) are the
 * job of CommunicationService — this is the internal bell feed.
 */
class NotificationService
{
    /**
     * @param  list<string>  $channels
     */
    public function push(
        ?int $userId,
        string $type,
        string $title,
        ?string $body = null,
        array $channels = ['in_app'],
        ?string $entityType = null,
        ?int $entityId = null,
    ): ?Notification {
        return $this->create(['user_id' => $userId], $type, $title, $body, $channels, $entityType, $entityId);
    }

    /** Raise an in-app notification for a student (portal feed). */
    public function pushToStudent(
        ?int $studentId,
        string $type,
        string $title,
        ?string $body = null,
        ?string $entityType = null,
        ?int $entityId = null,
    ): ?Notification {
        return $this->create(['student_id' => $studentId], $type, $title, $body, ['in_app'], $entityType, $entityId);
    }

    /** Raise an in-app notification for an agent (portal feed). */
    public function pushToAgent(
        ?int $agentId,
        string $type,
        string $title,
        ?string $body = null,
        ?string $entityType = null,
        ?int $entityId = null,
    ): ?Notification {
        return $this->create(['agent_id' => $agentId], $type, $title, $body, ['in_app'], $entityType, $entityId);
    }

    /**
     * @param  array<string, int|null>  $recipient  one of user_id/student_id/agent_id
     * @param  list<string>  $channels
     */
    private function create(
        array $recipient,
        string $type,
        string $title,
        ?string $body,
        array $channels,
        ?string $entityType,
        ?int $entityId,
    ): ?Notification {
        // No recipient → nothing to notify (e.g. a student with no counselor).
        if (array_values($recipient)[0] === null) {
            return null;
        }

        return Notification::create([
            ...$recipient,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'entity_type' => $entityId !== null ? $entityType : null,
            'entity_id' => $entityId,
            'channels' => $channels,
            'created_at' => now(),
        ]);
    }

    /**
     * Fan a bell notification out to every staff user holding any of the
     * given roles — the way a lifecycle handoff reaches a whole department
     * (Finance, Visa, Management) rather than a single assignee. An
     * optional user is excluded (e.g. an actor already notified directly).
     *
     * @param  list<string>  $roles
     * @return int number of users notified
     */
    public function pushToRoles(
        array $roles,
        string $type,
        string $title,
        ?string $body = null,
        ?int $excludeUserId = null,
        ?string $entityType = null,
        ?int $entityId = null,
    ): int {
        $ids = User::query()
            ->whereHas('roles', fn ($q) => $q->whereIn('name', $roles))
            ->when($excludeUserId !== null, fn ($q) => $q->whereKeyNot($excludeUserId))
            ->pluck('id');

        foreach ($ids as $id) {
            $this->push($id, $type, $title, $body, entityType: $entityType, entityId: $entityId);
        }

        return $ids->count();
    }
}

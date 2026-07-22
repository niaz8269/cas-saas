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
        if ($userId === null) {
            return null;
        }

        return Notification::create([
            'user_id' => $userId,
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

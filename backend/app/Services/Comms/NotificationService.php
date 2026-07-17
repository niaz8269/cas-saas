<?php

namespace App\Services\Comms;

use App\Models\Notification;

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
    ): ?Notification {
        if ($userId === null) {
            return null;
        }

        return Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'channels' => $channels,
            'created_at' => now(),
        ]);
    }
}

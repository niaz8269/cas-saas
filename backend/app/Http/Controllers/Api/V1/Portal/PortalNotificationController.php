<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * The student & agent portals' in-app notification feed. One controller
 * serves both guards: the recipient column is resolved from the
 * authenticated model, so every query is scoped to the caller's own feed.
 */
class PortalNotificationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $notifications = Notification::query()
            ->where($this->recipient($request))
            ->when($request->boolean('unread'), fn ($q) => $q->whereNull('read_at'))
            ->latest('id')
            ->paginate(min($request->integer('per_page', 20), 100));

        return NotificationResource::collection($notifications)
            ->additional(['meta' => ['unread' => $this->unread($request)]]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json(['unread' => $this->unread($request)]);
    }

    public function markRead(Request $request, Notification $notification): NotificationResource
    {
        [$column, $id] = [array_key_first($this->recipient($request)), array_values($this->recipient($request))[0]];

        abort_unless($notification->{$column} === $id, 404);

        if ($notification->read_at === null) {
            $notification->forceFill(['read_at' => now()])->save();
        }

        return new NotificationResource($notification);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        Notification::query()
            ->where($this->recipient($request))
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['unread' => 0]);
    }

    private function unread(Request $request): int
    {
        return Notification::query()
            ->where($this->recipient($request))
            ->whereNull('read_at')
            ->count();
    }

    /**
     * The recipient scope for the authenticated portal user.
     *
     * @return array<string, int>
     */
    private function recipient(Request $request): array
    {
        $user = $request->user();

        return $user instanceof Student
            ? ['student_id' => $user->id]
            : ['agent_id' => $user->id];
    }
}

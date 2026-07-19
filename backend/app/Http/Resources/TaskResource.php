<?php

namespace App\Http\Resources;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Task
 */
class TaskResource extends JsonResource
{
    private const ACTIVE = ['open', 'in_progress'];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'due_at' => $this->due_at?->toIso8601String(),
            'overdue' => $this->due_at !== null && $this->due_at->isPast() && in_array($this->status, self::ACTIVE, true),
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? [
                'id' => $this->assignee->id, 'name' => $this->assignee->name,
            ] : null),
            'student' => $this->whenLoaded('student', fn () => $this->student ? [
                'id' => $this->student->id, 'name' => $this->student->full_name,
            ] : null),
            // Link back to the record that spawned the task (lead/application/etc.).
            'related' => $this->related_type ? [
                'type' => class_basename($this->related_type), 'id' => $this->related_id,
            ] : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

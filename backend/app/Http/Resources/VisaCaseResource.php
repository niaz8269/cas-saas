<?php

namespace App\Http\Resources;

use App\Models\VisaCase;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin VisaCase
 */
class VisaCaseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'appointment_at' => $this->appointment_at?->toIso8601String(),
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'decision_at' => $this->decision_at?->toIso8601String(),
            'travel_ready_at' => $this->travel_ready_at?->toIso8601String(),
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'student_code' => $this->student->student_code,
                'full_name' => $this->student->full_name,
            ]),
            'application' => $this->whenLoaded('application', fn () => [
                'id' => $this->application->id,
                'application_code' => $this->application->application_code,
                'status' => $this->application->status,
                'university' => $this->application->relationLoaded('university') ? [
                    'id' => $this->application->university->id,
                    'name' => $this->application->university->name,
                ] : null,
            ]),
            'officer' => $this->whenLoaded('officer', fn () => $this->officer ? [
                'id' => $this->officer->id, 'name' => $this->officer->name,
            ] : null),
            'checklist' => VisaChecklistItemResource::collection($this->whenLoaded('checklistItems')),
            'status_history' => $this->whenLoaded('statusHistory', fn () => $this->statusHistory->map(fn ($entry) => [
                'from_status' => $entry->from_status,
                'to_status' => $entry->to_status,
                'note' => $entry->note,
                'changed_by' => $entry->changedBy?->name,
                'created_at' => $entry->created_at?->toIso8601String(),
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

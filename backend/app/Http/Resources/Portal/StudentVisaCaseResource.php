<?php

namespace App\Http\Resources\Portal;

use App\Models\VisaCase;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The student's own visa case: status, milestones and their document
 * checklist. Internal officer assignment is omitted.
 *
 * @mixin VisaCase
 */
class StudentVisaCaseResource extends JsonResource
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
            'application_code' => $this->whenLoaded('application', fn () => $this->application?->application_code),
            'checklist' => $this->whenLoaded('checklistItems', fn () => $this->checklistItems->map(fn ($item) => [
                'name' => $item->name,
                'is_required' => $item->is_required,
                'status' => $item->status,
            ])),
        ];
    }
}

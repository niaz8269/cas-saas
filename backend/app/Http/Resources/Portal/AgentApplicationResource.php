<?php

namespace App\Http\Resources\Portal;

use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An application as its agent sees it: lifecycle progress and catalog
 * context. Internal history actors, notes and officer assignment stay
 * hidden.
 *
 * @mixin Application
 */
class AgentApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'application_code' => $this->application_code,
            'status' => $this->status,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'student_code' => $this->student->student_code,
                'full_name' => $this->student->full_name,
            ]),
            'university' => $this->whenLoaded('university', fn () => $this->university?->name),
            'course' => $this->whenLoaded('course', fn () => $this->course ? [
                'name' => $this->course->name, 'level' => $this->course->level,
            ] : null),
            'intake' => $this->whenLoaded('intake', fn () => $this->intake?->name),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

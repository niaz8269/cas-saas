<?php

namespace App\Http\Resources;

use App\Models\Intake;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Intake
 */
class IntakeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'university_id' => $this->university_id,
            'course_id' => $this->course_id,
            'course' => $this->whenLoaded('course', fn () => [
                'id' => $this->course->id,
                'name' => $this->course->name,
                'level' => $this->course->level,
            ]),
            'name' => $this->name,
            'start_date' => $this->start_date?->toDateString(),
            'application_deadline' => $this->application_deadline?->toDateString(),
            'seats' => $this->seats,
            'status' => $this->status,
        ];
    }
}

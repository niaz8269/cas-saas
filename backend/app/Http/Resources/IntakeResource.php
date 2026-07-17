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
            'program_id' => $this->program_id,
            'program' => $this->whenLoaded('program', fn () => [
                'id' => $this->program->id,
                'name' => $this->program->name,
                'level' => $this->program->level,
            ]),
            'name' => $this->name,
            'start_date' => $this->start_date?->toDateString(),
            'application_deadline' => $this->application_deadline?->toDateString(),
            'seats' => $this->seats,
            'status' => $this->status,
        ];
    }
}

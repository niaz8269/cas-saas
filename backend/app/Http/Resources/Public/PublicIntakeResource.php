<?php

namespace App\Http\Resources\Public;

use App\Models\Intake;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Intake
 */
class PublicIntakeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'status' => $this->status,
            'start_date' => $this->start_date?->toDateString() ?? $this->start_date,
            'application_open_date' => $this->application_open_date?->toDateString(),
            'source_url' => $this->source_url,
            'verified_on' => $this->verified_on?->toDateString(),
            'application_deadline' => $this->application_deadline?->toDateString() ?? $this->application_deadline,
            'seats' => $this->seats,
            'program' => $this->whenLoaded('program', fn () => $this->program?->name),
        ];
    }
}

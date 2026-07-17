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
            'start_date' => $this->start_date?->toDateString() ?? $this->start_date,
            'application_deadline' => $this->application_deadline?->toDateString() ?? $this->application_deadline,
            'seats' => $this->seats,
            'program' => $this->whenLoaded('program', fn () => $this->program?->name),
        ];
    }
}

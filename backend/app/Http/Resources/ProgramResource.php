<?php

namespace App\Http\Resources;

use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Program
 */
class ProgramResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'university_id' => $this->university_id,
            'university' => $this->whenLoaded('university', fn () => [
                'id' => $this->university->id,
                'name' => $this->university->name,
                'code' => $this->university->code,
            ]),
            'name' => $this->name,
            'level' => $this->level,
            'teaching_language' => $this->teaching_language,
            'duration_months' => $this->duration_months,
            'tuition_fee' => $this->tuition_fee,
            'currency' => $this->currency,
            'apply_link' => $this->apply_link,
            'requirements' => $this->requirements,
            'status' => $this->status,
        ];
    }
}

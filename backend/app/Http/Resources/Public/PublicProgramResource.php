<?php

namespace App\Http\Resources\Public;

use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A program as the public website sees it — no internal/commission fields.
 *
 * @mixin Program
 */
class PublicProgramResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'level' => $this->level,
            'teaching_language' => $this->teaching_language,
            'duration_months' => $this->duration_months,
            'tuition_fee' => $this->tuition_fee,
            'currency' => $this->currency,
            'apply_link' => $this->apply_link,
            'requirements' => $this->requirements,
        ];
    }
}

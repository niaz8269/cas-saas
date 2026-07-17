<?php

namespace App\Http\Resources;

use App\Models\UniversityAgreement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin UniversityAgreement
 */
class UniversityAgreementResource extends JsonResource
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
            'course' => $this->whenLoaded('course', fn () => $this->course ? [
                'id' => $this->course->id,
                'name' => $this->course->name,
            ] : null),
            'commission_type' => $this->commission_type,
            'commission_value' => $this->commission_value,
            'currency' => $this->currency,
            'eligibility_trigger' => $this->eligibility_trigger,
            'valid_from' => $this->valid_from?->toDateString(),
            'valid_to' => $this->valid_to?->toDateString(),
        ];
    }
}

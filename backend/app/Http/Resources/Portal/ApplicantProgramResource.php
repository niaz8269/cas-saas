<?php

namespace App\Http\Resources\Portal;

use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A program offered to an applicant in the submission wizard: website-safe
 * program + university fields, its open intakes, and (in scholarship modes)
 * the eligible awards at that university.
 *
 * @mixin Program
 */
class ApplicantProgramResource extends JsonResource
{
    /** @return array<string, mixed> */
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
            'service_charge' => $this->applicant_service_charge,
            'university' => [
                'id' => $this->university->id,
                'name' => $this->university->name,
                'slug' => $this->university->slug,
                'city' => $this->university->city,
                'country' => $this->university->country?->name,
                'moe_listed' => (bool) $this->university->moe_listed,
            ],
            'intakes' => $this->intakes->map(fn ($intake) => [
                'id' => $intake->id,
                'name' => $intake->name,
                'start_date' => $intake->start_date?->toDateString(),
                'application_deadline' => $intake->application_deadline?->toDateString(),
            ])->values(),
            'scholarships' => $this->when(
                $this->relationLoaded('eligibleScholarships'),
                fn () => $this->eligibleScholarships->map(fn ($scholarship) => [
                    'id' => $scholarship->id,
                    'name' => $scholarship->name,
                    'type' => $scholarship->type,
                    'coverage' => $scholarship->coverage,
                ])->values(),
                [],
            ),
        ];
    }
}

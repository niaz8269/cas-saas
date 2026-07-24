<?php

namespace App\Http\Resources;

use App\Models\Scholarship;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Scholarship
 */
class ScholarshipResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'scope' => $this->scope,
            'university_id' => $this->university_id,
            'university' => $this->whenLoaded('university', fn () => [
                'id' => $this->university->id,
                'name' => $this->university->name,
            ]),
            'name' => $this->name,
            'slug' => $this->slug,
            'type' => $this->type,
            'coverage' => $this->coverage,
            'amount' => $this->amount,
            'tuition_after' => $this->tuition_after,
            'hostel_after' => $this->hostel_after,
            'stipend_monthly' => $this->stipend_monthly,
            'currency' => $this->currency,
            'criteria' => $this->criteria,
            'visibility' => (object) ($this->visibility ?? []),
            'description' => $this->description,
            'eligibility' => $this->eligibility,
            'how_to_apply' => $this->how_to_apply,
            'apply_link' => $this->apply_link,
            'deadline' => $this->deadline?->toDateString(),
            'benefits' => $this->benefits,
            'university_ids' => $this->whenLoaded('universities', fn () => $this->universities->pluck('id')->sort()->values(), []),
            'status' => $this->status,
        ];
    }
}

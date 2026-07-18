<?php

namespace App\Http\Resources\Public;

use App\Models\Scholarship;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Scholarship
 */
class PublicScholarshipResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'type' => $this->type,
            'coverage' => $this->coverage,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'description' => $this->description,
            'eligibility' => $this->eligibility,
            'how_to_apply' => $this->how_to_apply,
            'apply_link' => $this->apply_link,
            'deadline' => $this->deadline?->toDateString(),
            'university' => $this->whenLoaded('university', fn () => [
                'name' => $this->university?->name,
                'slug' => $this->university?->slug,
            ]),
        ];
    }
}

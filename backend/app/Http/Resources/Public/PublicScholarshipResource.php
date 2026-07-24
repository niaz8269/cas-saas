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
        $registered = $request->attributes->get('audience', 'public') !== 'public';

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'type' => $this->type,
            'coverage' => $this->coverage,
            'currency' => $this->currency,
            'description' => $this->description,
            'eligibility' => $this->eligibility,
            // Award amount, deadline and how-to-apply are registered-only.
            'details_locked' => ! $registered,
            'amount' => $registered ? $this->amount : null,
            'deadline' => $registered ? $this->deadline?->toDateString() : null,
            'how_to_apply' => $registered ? $this->how_to_apply : null,
            'apply_link' => $registered ? $this->apply_link : null,
            'university' => $this->whenLoaded('university', fn () => [
                'name' => $this->university?->name,
                'slug' => $this->university?->slug,
            ]),
        ];
    }
}

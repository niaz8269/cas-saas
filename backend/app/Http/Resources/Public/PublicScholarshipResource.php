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
        $audience = $request->attributes->get('audience', 'public');
        // Per-record, admin-configurable visibility per section (ADR-0015).
        $amountVisible = $this->resource->audienceCanSee('amount', $audience);
        $deadlineVisible = $this->resource->audienceCanSee('deadline', $audience);
        $howVisible = $this->resource->audienceCanSee('how_to_apply', $audience);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'type' => $this->type,
            'coverage' => $this->coverage,
            'currency' => $this->currency,
            'description' => $this->description,
            'eligibility' => $this->eligibility,
            // Award specifics — each gated per the record's config.
            'details_locked' => ! $amountVisible,
            'amount' => $amountVisible ? $this->amount : null,
            'deadline' => $deadlineVisible ? $this->deadline?->toDateString() : null,
            'how_to_apply' => $howVisible ? $this->how_to_apply : null,
            'apply_link' => $howVisible ? $this->apply_link : null,
            'university' => $this->whenLoaded('university', fn () => [
                'name' => $this->university?->name,
                'slug' => $this->university?->slug,
            ]),
        ];
    }
}

<?php

namespace App\Http\Resources\Exclusives;

use App\Models\ExclusiveOffer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One exclusive offer. Staff see every agency level's commission; an agency sees only the rate for its own level
 * (the request carries it as the `exclusive_agent_level` attribute) and none of the internal fields.
 *
 * @mixin ExclusiveOffer
 */
class ExclusiveOfferResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $level = $request->attributes->get('exclusive_agent_level');

        $data = [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'offer_type' => $this->offer_type,
            'summary' => $this->summary,
            'university' => $this->whenLoaded('university', fn () => $this->university ? ['id' => $this->university->id, 'name' => $this->university->name, 'slug' => $this->university->slug, 'city' => $this->university->city] : null),
            'program' => $this->whenLoaded('program', fn () => $this->program ? ['id' => $this->program->id, 'name' => $this->program->name, 'level' => $this->program->level] : null),
            'commission_notes' => $this->commission_notes,
            'fee_structure' => $this->fee_structure ?? [],
            'fee_notes' => $this->fee_notes,
            'eligible_nationalities' => $this->eligible_nationalities ?? [],
            'restricted_nationalities' => $this->restricted_nationalities ?? [],
            'nationality_notes' => $this->nationality_notes,
            'conditions' => $this->conditions,
            'published_at' => $this->published_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'materials' => $this->whenLoaded('materials', fn () => ExclusiveMaterialResource::collection($this->materials)->resolve($request)),
            'materials_count' => $this->whenCounted('materials'),
        ];

        if ($level !== null) {
            return $data + ['commission' => $this->rateFor($level), 'agency_level' => $level];
        }

        return $data + [
            'status' => $this->status,
            'sort_order' => $this->sort_order,
            'university_id' => $this->university_id,
            'program_id' => $this->program_id,
            'commission_rates' => (object) ($this->commission_rates ?? []),
        ];
    }
}

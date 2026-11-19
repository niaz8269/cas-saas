<?php

namespace App\Http\Resources\Exclusives;

use App\Models\ExclusiveOffer;
use App\Models\University;
use App\Services\Media\ImageService;
use App\Services\Media\Thumbnails;
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
            'audience' => $this->audience,
            'summary' => $this->summary,
            'university' => $this->whenLoaded('university', fn () => $this->university ? $this->universityCard($this->university) : null),
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

    /** @return array<string, mixed> The name, place and pictures a card shows, the same ones the public university cards use. */
    private function universityCard(University $u): array
    {
        $images = app(ImageService::class);

        return [
            'id' => $u->id,
            'name' => $u->name,
            'slug' => $u->slug,
            'city' => $u->city,
            'province' => $u->province,
            'logo_url' => $images->url($u->logo_path),
            'emblem_url' => $images->url($u->emblem_path),
            'cover_url' => $images->url($u->cover_path),
            'cover_thumb_url' => app(Thumbnails::class)->urlFor($u->cover_path),
        ];
    }
}

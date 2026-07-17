<?php

namespace App\Http\Resources\Public;

use App\Models\University;
use App\Services\Media\ImageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A university for the public website. Whitelists website-safe fields
 * only — no commission agreements, internal contacts, audit columns or
 * counts of internal data. Nested programs/intakes/scholarships are
 * included on the detail view (when eager-loaded).
 *
 * @mixin University
 */
class PublicUniversityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $images = app(ImageService::class);
        $rep = $this->representative_professor;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'city' => $this->city,
            'address' => $this->address,
            'country' => $this->whenLoaded('country', fn () => $this->country?->name),
            'website' => $this->website,
            'apply_link' => $this->apply_link,
            'logo_url' => $images->url($this->logo_path),
            'cover_url' => $images->url($this->cover_path),
            'moe_listed' => $this->moe_listed,
            'nearest_airport' => $this->nearest_airport,
            'about' => $this->about,
            'requirements' => $this->requirements ?? [],
            'representative_professor' => $rep ? [
                'name' => $rep['name'] ?? null,
                'title' => $rep['title'] ?? null,
                'photo_url' => $images->url($rep['photo'] ?? null),
            ] : null,
            'programs_count' => $this->whenCounted('programs'),
            // Detail-only nested collections (present when eager-loaded).
            'programs' => PublicProgramResource::collection($this->whenLoaded('programs')),
            'intakes' => PublicIntakeResource::collection($this->whenLoaded('intakes')),
            'scholarships' => PublicScholarshipResource::collection($this->whenLoaded('scholarships')),
        ];
    }
}

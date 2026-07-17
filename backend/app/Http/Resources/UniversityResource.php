<?php

namespace App\Http\Resources;

use App\Models\University;
use App\Services\Media\ImageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin University
 */
class UniversityResource extends JsonResource
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
            'code' => $this->code,
            'slug' => $this->slug,
            'city' => $this->city,
            'address' => $this->address,
            'website' => $this->website,
            'apply_link' => $this->apply_link,
            'logo_path' => $this->logo_path,
            'cover_path' => $this->cover_path,
            'logo_url' => $images->url($this->logo_path),
            'cover_url' => $images->url($this->cover_path),
            'status' => $this->status,
            'moe_listed' => $this->moe_listed,
            'nearest_airport' => $this->nearest_airport,
            'about' => $this->about,
            'requirements' => $this->requirements ?? [],
            'representative_professor' => $rep ? [
                'name' => $rep['name'] ?? null,
                'title' => $rep['title'] ?? null,
                'photo' => $rep['photo'] ?? null,
                'photo_url' => $images->url($rep['photo'] ?? null),
            ] : null,
            'country' => $this->whenLoaded('country', fn () => [
                'id' => $this->country->id,
                'name' => $this->country->name,
                'iso2' => $this->country->iso2,
            ]),
            'courses_count' => $this->whenCounted('courses'),
            'intakes_count' => $this->whenCounted('intakes'),
            'scholarships_count' => $this->whenCounted('scholarships'),
            'agreements_count' => $this->whenCounted('agreements'),
            'contacts' => UniversityContactResource::collection($this->whenLoaded('contacts')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

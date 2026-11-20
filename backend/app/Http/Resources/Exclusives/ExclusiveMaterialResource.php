<?php

namespace App\Http\Resources\Exclusives;

use App\Models\ExclusiveMaterial;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ExclusiveMaterial */
class ExclusiveMaterialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'exclusive_offer_id' => $this->exclusive_offer_id,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'original_name' => $this->original_name,
            'mime' => $this->mime,
            'size' => (int) $this->size,
            'created_at' => $this->created_at?->toIso8601String(),
            // Download counts are for staff only.
            'download_count' => $this->when($request->attributes->get('exclusive_agent_level') === null, (int) $this->download_count),
        ];
    }
}

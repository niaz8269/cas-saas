<?php

namespace App\Http\Resources;

use App\Models\MarketingSource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MarketingSource
 */
class MarketingSourceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'channel' => $this->channel,
            'is_active' => (bool) $this->is_active,
            'campaigns_count' => $this->whenCounted('campaigns'),
        ];
    }
}

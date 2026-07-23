<?php

namespace App\Http\Resources;

use App\Models\WebsiteSource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WebsiteSource
 */
class WebsiteSourceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'domain' => $this->domain,
            'university_focus' => $this->university_focus,
            'api_source_id' => $this->api_source_id,
            'is_active' => (bool) $this->is_active,
        ];
    }
}

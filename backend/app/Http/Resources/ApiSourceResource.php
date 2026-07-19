<?php

namespace App\Http\Resources;

use App\Models\ApiSource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ApiSource
 */
class ApiSourceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'website_url' => $this->website_url,
            'is_active' => (bool) $this->is_active,
            'university' => $this->whenLoaded('university', fn () => $this->university ? [
                'id' => $this->university->id, 'name' => $this->university->name,
            ] : null),
            'default_program' => $this->whenLoaded('defaultProgram', fn () => $this->defaultProgram ? [
                'id' => $this->defaultProgram->id, 'name' => $this->defaultProgram->name, 'level' => $this->defaultProgram->level,
            ] : null),
            'active_keys_count' => $this->whenCounted('activeKeys'),
            // Keys never expose the hash or the plain value — only metadata.
            'keys' => $this->whenLoaded('apiKeys', fn () => $this->apiKeys->map(fn ($key) => [
                'id' => $key->id,
                'label' => 'cas_••••'.str_pad((string) $key->id, 4, '0', STR_PAD_LEFT),
                'rate_limit' => $key->rate_limit,
                'active' => $key->revoked_at === null,
                'revoked_at' => $key->revoked_at?->toIso8601String(),
                'created_at' => $key->created_at?->toIso8601String(),
            ])->values()->all()),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

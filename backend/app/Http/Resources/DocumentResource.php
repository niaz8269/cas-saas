<?php

namespace App\Http\Resources;

use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Document
 */
class DocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->whenLoaded('type', fn () => $this->type ? [
                'id' => $this->type->id,
                'name' => $this->type->name,
                'category' => $this->type->category,
                'is_sensitive' => $this->type->is_sensitive,
            ] : null),
            'file_name' => $this->file_name,
            'mime' => $this->mime,
            'size' => $this->size,
            'status' => $this->status,
            'version' => $this->version,
            'verified_by' => $this->whenLoaded('verifier', fn () => $this->verifier?->name),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

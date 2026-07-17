<?php

namespace App\Http\Resources\Portal;

use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A document on the student's own record. The storage key is never
 * exposed; downloads go through the brokered pre-signed URL.
 *
 * @mixin Document
 */
class StudentDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'file_name' => $this->file_name,
            'mime' => $this->mime,
            'size' => $this->size,
            'status' => $this->status,
            'version' => $this->version,
            'type' => $this->whenLoaded('type', fn () => $this->type ? [
                'id' => $this->type->id, 'name' => $this->type->name, 'category' => $this->type->category,
            ] : null),
            'uploaded_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

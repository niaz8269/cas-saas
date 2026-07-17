<?php

namespace App\Http\Resources;

use App\Models\VisaChecklistItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin VisaChecklistItem
 */
class VisaChecklistItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'is_required' => $this->is_required,
            'status' => $this->status,
            'document_id' => $this->document_id,
        ];
    }
}

<?php

namespace App\Http\Resources;

use App\Models\Offer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Offer
 */
class OfferResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'application_id' => $this->application_id,
            'offer_type' => $this->offer_type,
            'reference_no' => $this->reference_no,
            'issued_date' => $this->issued_date?->toDateString(),
            'expiry_date' => $this->expiry_date?->toDateString(),
            'document_id' => $this->document_id,
            'status' => $this->status,
        ];
    }
}

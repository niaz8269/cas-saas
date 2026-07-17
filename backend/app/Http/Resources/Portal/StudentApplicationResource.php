<?php

namespace App\Http\Resources\Portal;

use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An application as the student sees it: progress, offers and a plain
 * status trail (no actor names, notes or internal officer assignment).
 *
 * @mixin Application
 */
class StudentApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'application_code' => $this->application_code,
            'status' => $this->status,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'university' => $this->whenLoaded('university', fn () => $this->university?->name),
            'program' => $this->whenLoaded('program', fn () => $this->program ? [
                'name' => $this->program->name, 'level' => $this->program->level,
            ] : null),
            'intake' => $this->whenLoaded('intake', fn () => $this->intake?->name),
            'offers' => $this->whenLoaded('offers', fn () => $this->offers->map(fn ($offer) => [
                'offer_type' => $offer->offer_type,
                'reference_no' => $offer->reference_no,
                'issued_date' => $offer->issued_date?->toDateString(),
                'expiry_date' => $offer->expiry_date?->toDateString(),
                'status' => $offer->status,
            ])),
            'progress' => $this->whenLoaded('statusHistory', fn () => $this->statusHistory->map(fn ($entry) => [
                'status' => $entry->to_status,
                'at' => $entry->created_at?->toIso8601String(),
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

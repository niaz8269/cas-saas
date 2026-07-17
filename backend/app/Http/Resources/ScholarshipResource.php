<?php

namespace App\Http\Resources;

use App\Models\Scholarship;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Scholarship
 */
class ScholarshipResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'university_id' => $this->university_id,
            'university' => $this->whenLoaded('university', fn () => [
                'id' => $this->university->id,
                'name' => $this->university->name,
            ]),
            'name' => $this->name,
            'type' => $this->type,
            'coverage' => $this->coverage,
            'criteria' => $this->criteria,
            'deadline' => $this->deadline?->toDateString(),
            'status' => $this->status,
        ];
    }
}

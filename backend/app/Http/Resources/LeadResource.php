<?php

namespace App\Http\Resources;

use App\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Lead
 */
class LeadResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'status' => $this->status,
            'intake_route' => $this->intake_route,
            'form_type' => $this->form_type,
            'form_fields' => (array) data_get($this->meta, 'form', []),
            'message' => $this->message,
            'country' => $this->whenLoaded('country', fn () => [
                'id' => $this->country->id, 'name' => $this->country->name, 'iso2' => $this->country->iso2,
            ]),
            'marketing_source' => $this->whenLoaded('marketingSource', fn () => $this->marketingSource ? [
                'id' => $this->marketingSource->id, 'name' => $this->marketingSource->name,
            ] : null),
            'website_source' => $this->whenLoaded('websiteSource', fn () => $this->websiteSource ? [
                'id' => $this->websiteSource->id, 'domain' => $this->websiteSource->domain,
            ] : null),
            'campaign' => $this->whenLoaded('campaign', fn () => $this->campaign ? [
                'id' => $this->campaign->id, 'name' => $this->campaign->name,
            ] : null),
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? [
                'id' => $this->assignee->id, 'name' => $this->assignee->name,
            ] : null),
            'student_id' => $this->student_id,
            'duplicate_of' => $this->duplicate_of,
            'review' => (bool) data_get($this->meta, 'dedup.review', false),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

<?php

namespace App\Http\Resources;

use App\Models\Agent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin view of an agent/partner account — the full application details staff
 * review before approving or rejecting a partner request.
 *
 * @mixin Agent
 */
class AgentRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'agent_code' => $this->agent_code,
            'company_name' => $this->name,
            'contact_name' => $this->contact_name,
            'type' => $this->type,
            'email' => $this->email,
            'phone' => $this->phone,
            'website' => $this->website,
            'address' => $this->address,
            'country' => $this->whenLoaded('country', fn () => $this->country?->name),
            'status' => $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

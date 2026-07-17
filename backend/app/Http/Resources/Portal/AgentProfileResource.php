<?php

namespace App\Http\Resources\Portal;

use App\Models\Agent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The agent's own portal profile. Internal fields (agreements, hierarchy
 * economics) are deliberately absent.
 *
 * @mixin Agent
 */
class AgentProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'agent_code' => $this->agent_code,
            'name' => $this->name,
            'type' => $this->type,
            'email' => $this->email,
            'phone' => $this->phone,
            'status' => $this->status,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
        ];
    }
}

<?php

namespace App\Http\Resources;

use App\Models\Communication;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Communication
 */
class CommunicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'channel' => $this->channel,
            'direction' => $this->direction,
            'template' => $this->template,
            'body' => $this->body,
            'status' => $this->status,
            'sent_by' => $this->whenLoaded('sender', fn () => $this->sender?->name),
            'logs' => $this->whenLoaded('logs', fn () => $this->logs->map(fn ($log) => [
                'provider' => $log->provider,
                'status' => $log->status,
                'error' => $log->error,
                'created_at' => $log->created_at?->toIso8601String(),
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

<?php

namespace App\Http\Resources;

use App\Models\ErrorLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ErrorLog
 */
class ErrorLogResource extends JsonResource
{
    /** The full stack trace/context is only included on the detail endpoint. */
    public bool $detail = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'level' => $this->level,
            'type' => $this->type,
            'message' => $this->message,
            'file' => $this->file,
            'line' => $this->line,
            'url' => $this->url,
            'method' => $this->method,
            'status' => $this->status,
            'actor' => $this->user_type ? "{$this->user_type} #{$this->user_id}" : null,
            'ip' => $this->ip,
            'user_agent' => $this->user_agent,
            'occurrences' => $this->occurrences,
            'first_seen_at' => $this->first_seen_at?->toIso8601String(),
            'last_seen_at' => $this->last_seen_at?->toIso8601String(),
            'resolved' => $this->resolved_at !== null,
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'resolved_by' => $this->whenLoaded('resolver', fn () => $this->resolver?->name),
            'context' => $this->when($this->detail, fn () => $this->context),
        ];
    }
}

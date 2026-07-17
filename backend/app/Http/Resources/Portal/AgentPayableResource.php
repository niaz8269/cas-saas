<?php

namespace App\Http\Resources\Portal;

use App\Models\AgentPayable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The agent's own commission share (report §5.7: "commission visibility —
 * own records only"). Deliberately excludes every CAS↔university amount
 * (expected/eligible/invoiced/received) — only the agent's share exists
 * on this surface.
 *
 * @mixin AgentPayable
 */
class AgentPayableResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $application = $this->commission?->application;

        return [
            'id' => $this->id,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'status' => $this->status,
            'computed_at' => $this->computed_at?->toIso8601String(),
            'student' => $application?->student ? [
                'student_code' => $application->student->student_code,
                'full_name' => $application->student->full_name,
            ] : null,
            'university' => $this->commission?->university?->name,
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(fn ($payment) => [
                'amount' => $payment->amount,
                'method' => $payment->method,
                'reference' => $payment->reference,
                'paid_at' => $payment->paid_at?->toIso8601String(),
            ])),
        ];
    }
}

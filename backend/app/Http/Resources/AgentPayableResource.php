<?php

namespace App\Http\Resources;

use App\Models\AgentPayable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AgentPayable
 */
class AgentPayableResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'commission_id' => $this->commission_id,
            'agent' => $this->whenLoaded('agent', fn () => [
                'id' => $this->agent->id,
                'name' => $this->agent->name,
                'agent_code' => $this->agent->agent_code,
                'type' => $this->agent->type,
            ]),
            'student' => $this->when(
                $this->relationLoaded('commission')
                    && $this->commission->relationLoaded('application')
                    && $this->commission->application->relationLoaded('student'),
                fn () => [
                    'id' => $this->commission->application->student->id,
                    'full_name' => $this->commission->application->student->full_name,
                ],
            ),
            'amount' => $this->amount,
            'currency' => $this->currency,
            'status' => $this->status,
            'computed_at' => $this->computed_at?->toIso8601String(),
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(fn ($payment) => [
                'id' => $payment->id,
                'amount' => $payment->amount,
                'method' => $payment->method,
                'reference' => $payment->reference,
                'paid_at' => $payment->paid_at?->toIso8601String(),
            ])),
        ];
    }
}

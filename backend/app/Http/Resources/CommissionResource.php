<?php

namespace App\Http\Resources;

use App\Models\Commission;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Commission
 */
class CommissionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'currency' => $this->currency,
            'expected_amount' => $this->expected_amount,
            'eligible_amount' => $this->eligible_amount,
            'invoiced_amount' => $this->invoiced_amount,
            'received_amount' => $this->received_amount,
            'eligibility_confirmed_at' => $this->eligibility_confirmed_at?->toIso8601String(),
            'application' => $this->whenLoaded('application', fn () => [
                'id' => $this->application->id,
                'application_code' => $this->application->application_code,
                'status' => $this->application->status,
                'student' => $this->application->relationLoaded('student') && $this->application->student ? [
                    'id' => $this->application->student->id,
                    'full_name' => $this->application->student->full_name,
                    'student_code' => $this->application->student->student_code,
                ] : null,
            ]),
            'university' => $this->whenLoaded('university', fn () => [
                'id' => $this->university->id,
                'name' => $this->university->name,
                'code' => $this->university->code,
            ]),
            'agreement' => $this->whenLoaded('agreement', fn () => $this->agreement ? [
                'id' => $this->agreement->id,
                'commission_type' => $this->agreement->commission_type,
                'commission_value' => $this->agreement->commission_value,
            ] : null),
            'status_history' => $this->whenLoaded('statusHistory', fn () => $this->statusHistory->map(fn ($entry) => [
                'from_status' => $entry->from_status,
                'to_status' => $entry->to_status,
                'amount' => $entry->amount,
                'reference' => $entry->reference,
                'changed_by' => $entry->changedBy?->name,
                'created_at' => $entry->created_at?->toIso8601String(),
            ])),
            'payables' => AgentPayableResource::collection($this->whenLoaded('payables')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

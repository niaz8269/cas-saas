<?php

namespace App\Http\Resources;

use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Invoice
 */
class InvoiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_no' => $this->invoice_no,
            'party_type' => $this->party_type,
            'party_id' => $this->party_id,
            'party_name' => $this->when(isset($this->party_name), $this->party_name ?? null),
            'application' => $this->whenLoaded('application', fn () => $this->application ? [
                'id' => $this->application->id,
                'application_code' => $this->application->application_code,
                'student' => $this->application->relationLoaded('student') && $this->application->student ? [
                    'id' => $this->application->student->id,
                    'full_name' => $this->application->student->full_name,
                ] : null,
            ] : null),
            'currency' => $this->currency,
            'subtotal' => $this->subtotal,
            'tax' => $this->tax,
            'total' => $this->total,
            'amount_paid' => $this->amount_paid,
            'status' => $this->status,
            'issued_at' => $this->issued_at?->toIso8601String(),
            'due_at' => $this->due_at?->toIso8601String(),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'fee_type' => $item->fee_type,
                'description' => $item->description,
                'qty' => $item->qty,
                'unit_price' => $item->unit_price,
                'amount' => $item->amount,
            ])),
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(fn ($payment) => [
                'id' => $payment->id,
                'payment_no' => $payment->payment_no,
                'amount' => $payment->amount,
                'method' => $payment->method,
                'reference' => $payment->reference,
                'received_at' => $payment->received_at?->toIso8601String(),
                'recorded_by' => $payment->recorder?->name,
            ])),
            // Proof of payment the applicant filed. `pending` means nobody has
            // confirmed it yet — on a processing-fee invoice that is what is
            // holding the student's application.
            'pending_receipts_count' => $this->whenCounted('pending_receipts_count'),
            'receipts' => $this->whenLoaded('documents', fn () => $this->documents->map(fn ($doc) => [
                'id' => $doc->id,
                'file_name' => $doc->file_name,
                'status' => $doc->status,
                'uploaded_at' => $doc->created_at?->toIso8601String(),
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

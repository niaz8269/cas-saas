<?php

namespace App\Http\Resources\Portal;

use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An invoice the student owes: line items, total, running paid amount and
 * their receipts. Only party_type='student' invoices reach this surface —
 * agent/university (commission) invoices are never exposed here.
 *
 * @mixin Invoice
 */
class StudentInvoiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_no' => $this->invoice_no,
            'currency' => $this->currency,
            'subtotal' => $this->subtotal,
            'tax' => $this->tax,
            'total' => $this->total,
            'amount_paid' => $this->amount_paid,
            'status' => $this->status,
            'issued_at' => $this->issued_at?->toIso8601String(),
            'due_at' => $this->due_at?->toIso8601String(),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'description' => $item->description,
                'qty' => $item->qty,
                'unit_price' => $item->unit_price,
                'amount' => $item->amount,
            ])),
            'receipts' => $this->whenLoaded('payments', fn () => $this->payments->map(fn ($payment) => [
                'payment_no' => $payment->payment_no,
                'amount' => $payment->amount,
                'method' => $payment->method,
                'received_at' => $payment->received_at?->toIso8601String(),
            ])),
        ];
    }
}

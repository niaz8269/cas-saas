<?php

namespace App\Services\Finance;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    /**
     * @param  list<array{description: string, qty?: float|int, unit_price: float|int, fee_type?: string|null}>  $items
     */
    public function create(
        string $partyType,
        int $partyId,
        ?int $applicationId,
        string $currency,
        array $items,
        User $actor,
        string $status = 'issued',
        int $dueDays = 30,
    ): Invoice {
        return DB::transaction(function () use ($partyType, $partyId, $applicationId, $currency, $items, $actor, $status, $dueDays) {
            $subtotal = collect($items)->sum(fn ($item) => ($item['qty'] ?? 1) * $item['unit_price']);

            $invoice = Invoice::create([
                'invoice_no' => $this->nextNumber('INV', Invoice::class, 'invoice_no'),
                'party_type' => $partyType,
                'party_id' => $partyId,
                'application_id' => $applicationId,
                'currency' => $currency,
                'subtotal' => $subtotal,
                'tax' => 0,
                'total' => $subtotal,
                'status' => $status,
                'issued_at' => $status === 'draft' ? null : now(),
                'due_at' => now()->addDays($dueDays),
                'created_by' => $actor->id,
            ]);

            foreach ($items as $item) {
                $qty = $item['qty'] ?? 1;
                $invoice->items()->create([
                    'fee_type' => $item['fee_type'] ?? null,
                    'description' => $item['description'],
                    'qty' => $qty,
                    'unit_price' => $item['unit_price'],
                    'amount' => $qty * $item['unit_price'],
                ]);
            }

            return $invoice;
        });
    }

    /**
     * Record a receipt; invoice status follows the running paid total.
     */
    public function recordPayment(
        Invoice $invoice,
        float $amount,
        User $actor,
        ?string $method = null,
        ?string $reference = null,
    ): Payment {
        return DB::transaction(function () use ($invoice, $amount, $actor, $method, $reference) {
            $payment = $invoice->payments()->create([
                'payment_no' => $this->nextNumber('PAY', Payment::class, 'payment_no'),
                'amount' => $amount,
                'currency' => $invoice->currency,
                'method' => $method,
                'reference' => $reference,
                'received_at' => now(),
                'recorded_by' => $actor->id,
            ]);

            $paid = (float) $invoice->amount_paid + $amount;

            $invoice->update([
                'amount_paid' => $paid,
                'status' => $paid >= (float) $invoice->total ? 'paid' : 'partially_paid',
            ]);

            return $payment;
        });
    }

    /**
     * Void an invoice raised in error. Only permitted while it carries no
     * payments (a settled invoice must be corrected with a refund/credit note,
     * never overwritten). The status change is captured by the audit trail.
     */
    public function void(Invoice $invoice): Invoice
    {
        $invoice->update(['status' => 'cancelled']);

        return $invoice;
    }

    /**
     * Refund against a settled invoice, recorded as an append-only negative
     * receipt (an adjusting entry — the original payment history is never
     * altered). The paid total and status follow the new running balance.
     */
    public function recordRefund(Invoice $invoice, float $amount, User $actor, string $reason): Payment
    {
        return DB::transaction(function () use ($invoice, $amount, $actor, $reason) {
            $refund = $invoice->payments()->create([
                'payment_no' => $this->nextNumber('REF', Payment::class, 'payment_no'),
                'amount' => -abs($amount),
                'currency' => $invoice->currency,
                'method' => 'refund',
                'reference' => $reason,
                'received_at' => now(),
                'recorded_by' => $actor->id,
            ]);

            $paid = (float) $invoice->amount_paid - abs($amount);

            $invoice->update([
                'amount_paid' => $paid,
                'status' => match (true) {
                    $paid >= (float) $invoice->total => 'paid',
                    $paid > 0 => 'partially_paid',
                    default => 'issued',
                },
            ]);

            return $refund;
        });
    }

    private function nextNumber(string $prefix, string $model, string $column): string
    {
        $year = now()->year;
        $sequence = $model::query()->count() + 1;

        do {
            $number = sprintf('%s-%d-%05d', $prefix, $year, $sequence);
            $sequence++;
        } while ($model::query()->where($column, $number)->exists());

        return $number;
    }
}

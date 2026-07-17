<?php

use App\Models\AgentPayable;
use App\Models\AgentPayment;
use App\Models\Commission;
use App\Models\CommissionStatusHistory;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('creates every finance table from schema.sql', function () {
    foreach ([
        'invoices', 'invoice_items', 'payments',
        'commissions', 'commission_status_history',
        'agent_payables', 'agent_payments',
    ] as $table) {
        expect(Schema::hasTable($table))->toBeTrue("missing table: {$table}");
    }
});

it('builds an invoice with items and payments', function () {
    $invoice = Invoice::factory()->create(['total' => 30000]);
    InvoiceItem::create([
        'invoice_id' => $invoice->id,
        'description' => 'Tuition first year',
        'qty' => 1,
        'unit_price' => 30000,
        'amount' => 30000,
    ]);
    Payment::factory()->for($invoice)->create(['amount' => 10000]);

    expect($invoice->items)->toHaveCount(1)
        ->and($invoice->payments)->toHaveCount(1)
        ->and($invoice->items->first()->amount)->toBe('30000.00');
});

it('enforces one commission per application', function () {
    $commission = Commission::factory()->create();

    expect(fn () => Commission::factory()->create([
        'application_id' => $commission->application_id,
        'university_id' => $commission->university_id,
    ]))->toThrow(UniqueConstraintViolationException::class);
});

it('links the commission graph: history and agent payables with payouts', function () {
    $commission = Commission::factory()->create(['status' => 'received', 'received_amount' => 8000]);

    CommissionStatusHistory::create([
        'commission_id' => $commission->id,
        'from_status' => 'invoiced',
        'to_status' => 'received',
        'amount' => 8000,
        'created_at' => now(),
    ]);

    $payable = AgentPayable::factory()->for($commission)->create(['amount' => 4000]);
    AgentPayment::create([
        'agent_payable_id' => $payable->id,
        'amount' => 4000,
        'method' => 'bank_transfer',
        'reference' => 'TXN-1',
        'paid_at' => now(),
    ]);

    expect($commission->statusHistory)->toHaveCount(1)
        ->and($commission->payables)->toHaveCount(1)
        ->and($payable->payments)->toHaveCount(1)
        ->and($payable->payments->first()->payable->id)->toBe($payable->id);
});

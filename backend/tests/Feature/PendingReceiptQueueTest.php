<?php

use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function receiptOn(Invoice $invoice, string $status = 'pending'): Document
{
    return Document::create([
        'document_type_id' => DocumentType::firstOrCreate(['name' => 'Payment receipt'], ['category' => 'financial'])->id,
        'documentable_type' => Invoice::class,
        'documentable_id' => $invoice->id,
        'file_path' => "invoices/{$invoice->id}/receipt.jpg",
        'file_name' => 'receipt.jpg',
        'mime' => 'image/jpeg',
        'size' => 1024,
        'status' => $status,
    ]);
}

it('lists only invoices with a receipt nobody has confirmed', function () {
    actingAsStaffWith(['finance.view.global']);

    $waiting = Invoice::factory()->create(['status' => 'issued']);
    receiptOn($waiting);

    $noReceipt = Invoice::factory()->create(['status' => 'issued']);

    $alreadyConfirmed = Invoice::factory()->create(['status' => 'issued']);
    receiptOn($alreadyConfirmed, 'verified');

    // Settled invoices drop out even if an old receipt is still pending.
    $settled = Invoice::factory()->create(['status' => 'paid']);
    receiptOn($settled);

    $response = $this->getJson('/api/v1/invoices?filter[pending_receipt]=1')->assertOk();

    $ids = collect($response->json('data'))->pluck('id');

    expect($ids)->toHaveCount(1)
        ->and($ids->first())->toBe($waiting->id)
        ->and($ids)->not->toContain($noReceipt->id, $alreadyConfirmed->id, $settled->id);
});

it('counts the waiting receipts on every row so the list can flag them', function () {
    actingAsStaffWith(['finance.view.global']);

    $invoice = Invoice::factory()->create(['status' => 'issued']);
    receiptOn($invoice);
    receiptOn($invoice);
    receiptOn($invoice, 'verified'); // confirmed, so not waiting

    $this->getJson('/api/v1/invoices')
        ->assertOk()
        ->assertJsonPath('data.0.pending_receipts_count', 2);
});

it('shows the filed receipts on the invoice itself', function () {
    actingAsStaffWith(['finance.view.global']);

    $invoice = Invoice::factory()->create(['status' => 'issued']);
    receiptOn($invoice);

    $this->getJson("/api/v1/invoices/{$invoice->id}")
        ->assertOk()
        ->assertJsonPath('data.receipts.0.file_name', 'receipt.jpg')
        ->assertJsonPath('data.receipts.0.status', 'pending');
});

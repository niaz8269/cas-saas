<?php

use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('streams a branded invoice pdf to an authorized viewer', function () {
    actingAsStaffWith(['finance.view.global']);
    $invoice = Invoice::factory()->create(['invoice_no' => 'INV-2026-00001']);
    $invoice->items()->create([
        'description' => 'Application service fee', 'qty' => 1, 'unit_price' => 1200, 'amount' => 1200,
    ]);

    $response = $this->get("/api/v1/invoices/{$invoice->id}/pdf");

    $response->assertOk()->assertHeader('content-type', 'application/pdf');
    expect(substr((string) $response->getContent(), 0, 4))->toBe('%PDF');
});

it('denies the invoice pdf without finance view scope', function () {
    actingAsStaffWith([]);
    $invoice = Invoice::factory()->create();

    $this->get("/api/v1/invoices/{$invoice->id}/pdf")->assertForbidden();
});

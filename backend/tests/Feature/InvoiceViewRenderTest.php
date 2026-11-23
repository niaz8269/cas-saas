<?php

use App\Models\BankAccount;
use App\Models\Invoice;
use App\Models\InvoiceItem;

/**
 * Renders the invoice PDF's template to HTML (no PDF library needed), so a template error shows up in the tests
 * rather than only when someone downloads a PDF.
 */
function renderedInvoice(array $attributes, string $partyName): string
{
    $invoice = new Invoice($attributes + [
        'invoice_no' => 'INV-TEST-1', 'currency' => 'CNY', 'subtotal' => 800, 'tax' => 0, 'total' => 800, 'amount_paid' => 0, 'status' => 'issued',
    ]);
    $invoice->issued_at = now();
    $invoice->due_at = now()->addDays(30);
    $invoice->setRelation('items', collect([new InvoiceItem(['fee_type' => 'application_fee', 'description' => 'Application fee', 'qty' => 1, 'unit_price' => 800, 'amount' => 800])]));
    $invoice->setRelation('bankAccount', new BankAccount(['bank_name' => 'Sample Bank', 'account_name' => 'Holder', 'account_number' => '0000']));
    $invoice->setRelation('payments', collect());
    $invoice->setRelation('application', null);

    return view('pdf.invoice', [
        'invoice' => $invoice, 'partyName' => $partyName, 'voucher' => false, 'paymentInstructions' => null, 'logo' => null,
        'money' => fn ($v) => 'CNY '.number_format((float) $v, 2), 'balanceDue' => 800, 'issuedOn' => '23 Nov 2026', 'dueOn' => '23 Dec 2026',
    ])->render();
}

it('renders the invoice for a portal student with the party type', function () {
    $html = renderedInvoice(['party_type' => 'student', 'party_id' => 1], 'Ali Khan');

    expect($html)->toContain('Billed to (student)')->toContain('Ali Khan')->toContain('Application fee');
});

it('renders an invoice for someone outside the portal with the contact details written on it', function () {
    $html = renderedInvoice([
        'party_type' => 'external', 'bill_to_name' => 'Ali Raza', 'bill_to_email' => 'ali@example.com', 'bill_to_phone' => '+92 300 0000000',
    ], 'Ali Raza');

    expect($html)->toContain('Ali Raza')->toContain('ali@example.com')->toContain('+92 300 0000000')
        ->not->toContain('Billed to (external)')->not->toContain('Billed to (');
});

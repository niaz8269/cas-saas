<?php

use App\Models\BankAccount;
use App\Models\Invoice;
use App\Models\InvoiceItem;

/**
 * Renders the invoice PDF's template to HTML (no PDF library needed), so a template error shows up in the tests
 * rather than only when someone downloads a PDF.
 */
function renderedInvoice(array $attributes, string $partyName, float $balanceDue = 800, bool $voucher = false): string
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
        'invoice' => $invoice, 'partyName' => $partyName, 'voucher' => $voucher, 'paymentInstructions' => null, 'logo' => null,
        'money' => fn ($v) => 'CNY '.number_format((float) $v, 2), 'balanceDue' => $balanceDue, 'issuedOn' => '23 Nov 2026', 'dueOn' => '23 Dec 2026',
    ])->render();
}

it('renders a professional invoice: letterhead, details, items, totals and payment details', function () {
    $html = renderedInvoice(['party_type' => 'student', 'party_id' => 1], 'Ali Khan');

    expect($html)
        ->toContain('Invoice')->toContain('INV-TEST-1')
        ->toContain('Billed to')->toContain('Ali Khan')
        // The issuer: who is sending this, and how to reach them.
        ->toContain('CAS - Study in China')->toContain('info@cas.moe')->toContain('+86 176 4041 2827')->toContain('Dalian, China')
        // The invoice's own details and what is owed.
        ->toContain('Invoice date')->toContain('Due date')->toContain('Awaiting payment')
        ->toContain('Application fee')->toContain('Amount due')
        ->toContain('<h4>Payment details</h4>')->toContain('Sample Bank')->toContain('as the payment reference')
        ->not->toContain('electronically valid');
});

it('renders an invoice for someone outside the portal with the contact details written on it', function () {
    $html = renderedInvoice([
        'party_type' => 'external', 'bill_to_name' => 'Ali Raza', 'bill_to_email' => 'ali@example.com', 'bill_to_phone' => '+92 300 0000000',
    ], 'Ali Raza');

    expect($html)->toContain('Ali Raza')->toContain('ali@example.com')->toContain('+92 300 0000000')->not->toContain('Billed to (');
});

it('shows a settled invoice as paid, with no amount due and no payment request', function () {
    $html = renderedInvoice(['party_type' => 'student', 'party_id' => 1, 'status' => 'paid', 'amount_paid' => 800], 'Ali Khan', balanceDue: 0);

    expect($html)->toContain('Paid')->not->toContain('Amount due')->not->toContain('<h4>Payment details</h4>');
});

it('renders the fee voucher variant', function () {
    $html = renderedInvoice(['party_type' => 'student', 'party_id' => 1], 'Ali Khan', voucher: true);

    expect($html)->toContain('Fee voucher')->toContain('Confirmed with the CAS team')->toContain('How to pay');
});

<?php

namespace App\Services\Finance;

use App\Models\Invoice;
use App\Support\BrandAssets;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

/**
 * Renders the branded invoice PDF shared by staff and the student portal.
 * The caller supplies the already-resolved party label (staff resolves any
 * party type; the portal knows it is the authenticated student).
 *
 * The same sheet doubles as the student's FEE VOUCHER: what the CAS team has
 * confirmed with them, with how to pay, before they are asked for payment.
 */
class InvoicePdfRenderer
{
    public function stream(Invoice $invoice, string $partyName, bool $voucher = false, ?string $paymentInstructions = null): Response
    {
        $invoice->loadMissing(['items', 'payments.recorder:id,name', 'application:id,application_code']);

        $money = fn ($value) => $invoice->currency.' '.number_format((float) $value, 2);

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'partyName' => $partyName,
            'voucher' => $voucher,
            'paymentInstructions' => $paymentInstructions,
            'logo' => BrandAssets::logoDataUri(),
            'money' => $money,
            'balanceDue' => (float) $invoice->total - (float) $invoice->amount_paid,
            'issuedOn' => ($invoice->issued_at ?? $invoice->created_at ?? now())->format('d M Y'),
            'dueOn' => $invoice->due_at?->format('d M Y') ?? '—',
        ]);

        return $pdf->stream(($voucher ? 'fee-voucher-' : 'invoice-').$invoice->invoice_no.'.pdf');
    }
}

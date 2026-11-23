<!DOCTYPE html>
<html lang="en">
@php
    $isVoucher = $voucher ?? false;
    $co = config('company');
    $statusLabels = ['issued' => 'Awaiting payment', 'partially_paid' => 'Partly paid', 'paid' => 'Paid', 'cancelled' => 'Cancelled', 'draft' => 'Draft', 'overdue' => 'Overdue'];
    $statusLabel = $statusLabels[$invoice->status] ?? ucfirst(str_replace('_', ' ', (string) $invoice->status));
    $title = $isVoucher ? 'Fee voucher' : 'Invoice';
@endphp
<head>
    <meta charset="utf-8">
    <title>{{ $title }} {{ $invoice->invoice_no }}</title>
    <style>
        @page { margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; color: #1F2933; font-size: 10.5px; line-height: 1.55; }
        .sheet { padding: 40px 50px 90px; }
        table { border-collapse: collapse; }

        /* Letterhead */
        .letterhead { width: 100%; }
        .letterhead td { vertical-align: top; }
        .logo { width: 190px; }
        .brand-name { font-size: 15px; font-weight: bold; color: #14357C; margin-top: 6px; }
        .brand-tag { font-size: 9px; color: #64748B; letter-spacing: 0.3px; }
        .contact { text-align: right; font-size: 9px; color: #64748B; line-height: 1.7; }
        .contact strong { color: #1F2933; font-weight: bold; }
        .rule { border-top: 2px solid #14357C; margin: 18px 0 22px; }

        /* Title */
        .title { width: 100%; margin-bottom: 22px; }
        .title td { vertical-align: bottom; }
        .title .doc { font-size: 24px; color: #14357C; letter-spacing: 3px; text-transform: uppercase; }
        .title .no { text-align: right; font-size: 11px; color: #64748B; }
        .title .no strong { color: #1F2933; font-size: 13px; }

        /* Billed to + details */
        .parties { width: 100%; margin-bottom: 26px; }
        .parties td { vertical-align: top; }
        .lbl { font-size: 8.5px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 5px; }
        .party { font-size: 13px; font-weight: bold; color: #1F2933; }
        .party-sub { margin-top: 3px; color: #475569; font-size: 10px; line-height: 1.6; }
        .details { width: 100%; }
        .details td { padding: 4px 0; border-bottom: 1px solid #E8ECF3; font-size: 10px; }
        .details td.k { color: #64748B; width: 45%; }
        .details td.v { text-align: right; font-weight: bold; }

        /* Items */
        table.items { width: 100%; }
        table.items thead th { text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: 1px; color: #14357C; padding: 9px 10px; border-top: 1px solid #14357C; border-bottom: 1px solid #14357C; background: #F6F8FC; }
        table.items thead th.num { text-align: right; }
        table.items tbody td { padding: 11px 10px; border-bottom: 1px solid #E8ECF3; vertical-align: top; }
        table.items tbody td.num { text-align: right; white-space: nowrap; }

        /* Totals */
        .totals { width: 100%; margin-top: 12px; }
        .totals-box { width: 46%; }
        .totals-box td { padding: 5px 10px; font-size: 10.5px; }
        .totals-box td.k { color: #64748B; }
        .totals-box td.v { text-align: right; }
        .totals-box tr.total td { border-top: 1px solid #14357C; font-weight: bold; color: #14357C; font-size: 12px; padding-top: 8px; }
        .totals-box tr.due td { background: #EAF0FB; color: #14357C; font-weight: bold; font-size: 12.5px; padding: 9px 10px; }

        /* Payment details */
        .section { margin-top: 30px; }
        .section h4 { font-size: 8.5px; text-transform: uppercase; letter-spacing: 1px; color: #14357C; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #D5DCEA; }
        .panel { background: #F6F8FC; border: 1px solid #E2E8F0; padding: 14px 16px; }
        table.bank { width: 100%; }
        table.bank td { vertical-align: top; }
        table.kv td { padding: 3px 0; font-size: 10.5px; }
        table.kv td.k { color: #64748B; width: 120px; }
        .bank-qr { width: 130px; text-align: center; }
        .bank-qr img { width: 104px; height: 104px; background: #ffffff; padding: 4px; border: 1px solid #E2E8F0; }
        .bank-qr div { font-size: 8.5px; color: #64748B; margin-top: 3px; }
        .bank-note { margin-top: 8px; color: #475569; }
        .reference { margin-top: 10px; padding-top: 8px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #475569; }
        .note { color: #475569; font-size: 10px; line-height: 1.6; }
        .prow { padding: 5px 0; border-bottom: 1px solid #E8ECF3; font-size: 10px; }
        .prow .amt { float: right; font-weight: bold; }

        .thanks { margin-top: 28px; font-size: 11px; color: #14357C; }

        /* Footer */
        .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 50px 18px; border-top: 1px solid #E2E8F0; color: #64748B; font-size: 8.5px; line-height: 1.6; }
        .footer table { width: 100%; }
        .footer .right { text-align: right; }
    </style>
</head>
<body>
    <div class="sheet">
        <table class="letterhead">
            <tr>
                <td style="width: 50%;">
                    @if ($logo)
                        <img class="logo" src="{{ $logo }}" alt="CAS">
                    @else
                        <div class="brand-name">{{ $co['name'] }}</div>
                        <div class="brand-tag">{{ $co['tagline'] }}</div>
                    @endif
                </td>
                <td class="contact">
                    @if (! empty($co['legal_name']))
                        <strong>{{ $co['legal_name'] }}</strong><br>
                    @else
                        <strong>{{ $co['name'] }}</strong><br>
                    @endif
                    @if (! empty($co['registration']))
                        {{ $co['registration'] }}<br>
                    @endif
                    @if (! empty($co['address']))
                        {{ $co['address'] }}<br>
                    @endif
                    {{ implode('  ·  ', $co['offices']) }}<br>
                    {{ $co['email'] }}  ·  WhatsApp {{ $co['phone'] }}<br>
                    {{ $co['website'] }}
                </td>
            </tr>
        </table>
        <div class="rule"></div>

        <table class="title">
            <tr>
                <td class="doc">{{ $title }}</td>
                <td class="no">No. <strong>{{ $invoice->invoice_no }}</strong></td>
            </tr>
        </table>

        <table class="parties">
            <tr>
                <td style="width: 54%; padding-right: 24px;">
                    <div class="lbl">Billed to</div>
                    <div class="party">{{ $partyName ?? '—' }}</div>
                    <div class="party-sub">
                        @if ($invoice->party_type === 'external')
                            @if ($invoice->bill_to_email)
                                {{ $invoice->bill_to_email }}<br>
                            @endif
                            @if ($invoice->bill_to_phone)
                                {{ $invoice->bill_to_phone }}<br>
                            @endif
                            @if ($invoice->bill_to_address)
                                {{ $invoice->bill_to_address }}<br>
                            @endif
                        @endif
                        @if ($invoice->application)
                            Application {{ $invoice->application->application_code }}
                        @endif
                    </div>
                </td>
                <td style="width: 46%;">
                    <table class="details">
                        <tr><td class="k">Invoice date</td><td class="v">{{ $issuedOn }}</td></tr>
                        <tr><td class="k">Due date</td><td class="v">{{ $dueOn }}</td></tr>
                        <tr><td class="k">Currency</td><td class="v">{{ $invoice->currency }}</td></tr>
                        <tr><td class="k">Status</td><td class="v">{{ $statusLabel }}</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <table class="items">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="num" style="width: 40px;">Qty</th>
                    <th class="num" style="width: 100px;">Unit price</th>
                    <th class="num" style="width: 100px;">Amount</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($invoice->items as $item)
                    <tr>
                        <td>{{ $item->description }}</td>
                        <td class="num">{{ rtrim(rtrim(number_format((float) $item->qty, 2), '0'), '.') }}</td>
                        <td class="num">{{ $money($item->unit_price) }}</td>
                        <td class="num">{{ $money($item->amount) }}</td>
                    </tr>
                @empty
                    <tr><td colspan="4" style="color: #64748B; padding: 16px 10px;">No line items.</td></tr>
                @endforelse
            </tbody>
        </table>

        <table class="totals">
            <tr>
                <td></td>
                <td class="totals-box">
                    <table style="width: 100%;" class="totals-box">
                        <tr><td class="k">Subtotal</td><td class="v">{{ $money($invoice->subtotal) }}</td></tr>
                        @if ((float) $invoice->tax > 0)
                            <tr><td class="k">Tax</td><td class="v">{{ $money($invoice->tax) }}</td></tr>
                        @endif
                        <tr class="total"><td class="k">Total</td><td class="v">{{ $money($invoice->total) }}</td></tr>
                        @if ((float) $invoice->amount_paid > 0)
                            <tr><td class="k">Paid</td><td class="v">{{ $money($invoice->amount_paid) }}</td></tr>
                        @endif
                        @if ($balanceDue > 0)
                            <tr class="due"><td class="k" style="color: #14357C;">Amount due</td><td class="v">{{ $money($balanceDue) }}</td></tr>
                        @endif
                    </table>
                </td>
            </tr>
        </table>

        @if ($isVoucher)
            <div class="section">
                <h4>Confirmed with the CAS team</h4>
                <div class="note">
                    These are the fees and service charges the CAS team has confirmed with you.
                    Please do not pay any other amount.
                </div>
            </div>
        @endif

        @if ($balanceDue > 0 && ($invoice->bankAccount || $isVoucher))
            <div class="section">
                <h4>{{ $isVoucher ? 'How to pay' : 'Payment details' }}</h4>
                @if ($invoice->bankAccount)
                    <div class="panel">
                        @include('pdf._bank_account', ['bank' => $invoice->bankAccount])
                        <div class="reference">
                            Please use <strong>{{ $invoice->invoice_no }}</strong> as the payment reference{{ $isVoucher ? ', then upload your receipt in the student portal' : '' }}.
                        </div>
                    </div>
                @elseif (! empty($paymentInstructions))
                    <div class="panel">
                        {!! nl2br(e($paymentInstructions)) !!}
                        <div class="reference">
                            Please use <strong>{{ $invoice->invoice_no }}</strong> as the payment reference, then upload your receipt in the student portal.
                        </div>
                    </div>
                @else
                    <div class="note">
                        Payment details are shared by your CAS counselor. Please use <strong>{{ $invoice->invoice_no }}</strong> as the payment reference, then upload your receipt in the student portal.
                    </div>
                @endif
            </div>
        @endif

        @if ($invoice->payments->isNotEmpty())
            <div class="section">
                <h4>Payments received</h4>
                @foreach ($invoice->payments as $payment)
                    <div class="prow">
                        <span class="amt">{{ $money($payment->amount) }}</span>
                        <strong>{{ $payment->payment_no }}</strong>
                        &middot; {{ $payment->received_at?->format('d M Y') ?? '—' }}
                        {{ $payment->method ? ' · '.$payment->method : '' }}
                        {{ $payment->reference ? ' · '.$payment->reference : '' }}
                    </div>
                @endforeach
            </div>
        @endif

        @if (! $isVoucher && $balanceDue > 0)
            <div class="note" style="margin-top: 18px;">
                After you pay, please send your receipt to {{ $co['email'] }} or on WhatsApp ({{ $co['phone'] }}) so we can confirm your payment.
            </div>
        @endif

        <div class="thanks">Thank you for choosing {{ $co['name'] }}.</div>
    </div>

    <div class="footer">
        <table>
            <tr>
                <td>{{ $co['name'] }}  ·  {{ $co['website'] }}  ·  {{ $co['email'] }}</td>
                <td class="right">{{ $title }} {{ $invoice->invoice_no }}  ·  Generated {{ now()->format('d M Y') }}</td>
            </tr>
        </table>
    </div>
</body>
</html>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            color: #1F2933;
            font-size: 12px;
            line-height: 1.5;
        }
        .sheet { padding: 0 48px 48px; }
        .header {
            background: #14357C;
            color: #ffffff;
            padding: 22px 48px;
        }
        .header table { width: 100%; }
        .header .logo { width: 54px; vertical-align: middle; }
        .header .brand {
            padding-left: 14px;
            vertical-align: middle;
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 0.3px;
        }
        .header .brand small {
            display: block;
            font-size: 10px;
            font-weight: normal;
            opacity: 0.85;
            letter-spacing: 0.5px;
        }
        .header .doc {
            text-align: right;
            vertical-align: middle;
        }
        .header .doc .kind { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
        .header .doc .no { font-size: 11px; opacity: 0.9; margin-top: 2px; }
        .rule { height: 3px; background: #D81F26; width: 56px; margin: 26px 0 22px; }
        .meta { width: 100%; margin-bottom: 24px; }
        .meta td { vertical-align: top; width: 50%; }
        .meta .lbl {
            color: #64748B;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .meta .party { font-size: 14px; font-weight: bold; }
        .meta .right { text-align: right; }
        .status {
            display: inline-block;
            background: #EAF0FB;
            color: #14357C;
            padding: 2px 10px;
            border-radius: 10px;
            font-size: 10px;
            text-transform: capitalize;
        }
        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
        }
        table.items thead th {
            background: #F6F8FC;
            color: #64748B;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            text-align: left;
            padding: 9px 12px;
            border-bottom: 2px solid #E2E8F0;
        }
        table.items thead th.num { text-align: right; }
        table.items tbody td {
            padding: 10px 12px;
            border-bottom: 1px solid #E2E8F0;
        }
        table.items tbody td.num { text-align: right; }
        .totals { width: 100%; margin-top: 14px; }
        .totals td { padding: 0; vertical-align: top; }
        .totals .box { width: 260px; float: right; }
        .totals .row { padding: 5px 0; }
        .totals .row td { padding: 5px 12px; }
        .totals .row td.k { color: #64748B; }
        .totals .row td.v { text-align: right; }
        .totals .grand td {
            border-top: 2px solid #14357C;
            font-size: 14px;
            font-weight: bold;
            color: #14357C;
            padding-top: 8px;
        }
        .totals .due td {
            color: #D81F26;
            font-weight: bold;
        }
        .payments { margin-top: 40px; clear: both; }
        .payments h4 {
            color: #14357C;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #E2E8F0;
            padding-bottom: 6px;
            margin-bottom: 8px;
        }
        .payments .prow {
            padding: 5px 0;
            border-bottom: 1px solid #F0F3F8;
            font-size: 11px;
        }
        .payments .prow .amt { float: right; font-weight: bold; }
        .footer {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            padding: 12px 48px;
            border-top: 1px solid #E2E8F0;
            color: #64748B;
            font-size: 9px;
        }
        .footer table { width: 100%; }
        .footer .right { text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <table>
            <tr>
                <td style="width: 60%;">
                    @if ($logo)
                        <img class="logo" src="{{ $logo }}" alt="CAS">
                    @endif
                    <span class="brand">CAS
                        <small>Consultancy for Abroad Study &middot; www.cas.moe</small>
                    </span>
                </td>
                <td class="doc">
                    <div class="kind">INVOICE</div>
                    <div class="no">{{ $invoice->invoice_no }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="sheet">
        <div class="rule"></div>

        <table class="meta">
            <tr>
                <td>
                    <div class="lbl">Billed to ({{ $invoice->party_type }})</div>
                    <div class="party">{{ $partyName ?? '—' }}</div>
                    @if ($invoice->application)
                        <div style="margin-top: 4px; color: #64748B;">
                            Application {{ $invoice->application->application_code }}
                        </div>
                    @endif
                </td>
                <td class="right">
                    <div class="lbl">Status</div>
                    <span class="status">{{ str_replace('_', ' ', $invoice->status) }}</span>
                    <div style="margin-top: 12px; color: #64748B;">
                        Issued {{ $issuedOn }}<br>
                        Due {{ $dueOn }}
                    </div>
                </td>
            </tr>
        </table>

        <table class="items">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="num">Qty</th>
                    <th class="num">Unit price</th>
                    <th class="num">Amount</th>
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
                    <tr><td colspan="4" style="color: #64748B; padding: 16px 12px;">No line items.</td></tr>
                @endforelse
            </tbody>
        </table>

        <table class="totals">
            <tr><td>
                <table class="box">
                    <tr class="row"><td class="k">Subtotal</td><td class="v">{{ $money($invoice->subtotal) }}</td></tr>
                    <tr class="row"><td class="k">Tax</td><td class="v">{{ $money($invoice->tax) }}</td></tr>
                    <tr class="row grand"><td class="k">Total</td><td class="v">{{ $money($invoice->total) }}</td></tr>
                    <tr class="row"><td class="k">Paid</td><td class="v">{{ $money($invoice->amount_paid) }}</td></tr>
                    @if ($balanceDue > 0)
                        <tr class="row due"><td class="k">Balance due</td><td class="v">{{ $money($balanceDue) }}</td></tr>
                    @endif
                </table>
            </td></tr>
        </table>

        @if ($invoice->payments->isNotEmpty())
            <div class="payments">
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
    </div>

    <div class="footer">
        <table>
            <tr>
                <td>CAS — Consultancy for Abroad Study &middot; www.cas.moe &middot; {{ $invoice->currency }}</td>
                <td class="right">Generated {{ $issuedOn }} &middot; electronically valid without signature.</td>
            </tr>
        </table>
    </div>
</body>
</html>

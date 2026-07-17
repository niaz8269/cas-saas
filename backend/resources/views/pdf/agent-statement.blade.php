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
        .header .doc { text-align: right; vertical-align: middle; }
        .header .doc .kind { font-size: 15px; font-weight: bold; letter-spacing: 1px; }
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
        .cards { width: 100%; margin-bottom: 24px; border-collapse: separate; border-spacing: 10px 0; }
        .cards td {
            width: 50%;
            background: #F6F8FC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 14px 16px;
        }
        .cards .lbl {
            color: #64748B;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
        }
        .cards .val { font-size: 20px; font-weight: bold; color: #14357C; margin-top: 4px; }
        .cards .paid .val { color: #15803D; }
        table.rows { width: 100%; border-collapse: collapse; }
        table.rows thead th {
            background: #F6F8FC;
            color: #64748B;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            text-align: left;
            padding: 9px 12px;
            border-bottom: 2px solid #E2E8F0;
        }
        table.rows thead th.num { text-align: right; }
        table.rows tbody td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; }
        table.rows tbody td.num { text-align: right; }
        table.rows tbody td .sub { display: block; color: #64748B; font-size: 10px; }
        .status {
            display: inline-block;
            padding: 2px 9px;
            border-radius: 10px;
            font-size: 10px;
            text-transform: capitalize;
        }
        .status.payable { background: #EAF0FB; color: #14357C; }
        .status.paid { background: #DCFCE7; color: #15803D; }
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
                    <div class="kind">COMMISSION STATEMENT</div>
                    <div class="no">{{ $agent->agent_code }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="sheet">
        <div class="rule"></div>

        <table class="meta">
            <tr>
                <td>
                    <div class="lbl">Prepared for</div>
                    <div class="party">{{ $agent->name }}</div>
                    <div style="margin-top: 4px; color: #64748B;">
                        {{ $agent->agent_code }}{{ $agent->email ? ' · '.$agent->email : '' }}
                    </div>
                </td>
                <td class="right">
                    <div class="lbl">Statement date</div>
                    <div style="font-weight: bold;">{{ $generatedOn }}</div>
                    <div style="margin-top: 4px; color: #64748B;">Currency: {{ $currency }}</div>
                </td>
            </tr>
        </table>

        <table class="cards">
            <tr>
                <td>
                    <div class="lbl">Outstanding (payable)</div>
                    <div class="val">{{ $currency }} {{ $money($totals['payable'] ?? 0) }}</div>
                </td>
                <td class="paid">
                    <div class="lbl">Paid to date</div>
                    <div class="val">{{ $currency }} {{ $money($totals['paid'] ?? 0) }}</div>
                </td>
            </tr>
        </table>

        <table class="rows">
            <thead>
                <tr>
                    <th>Student</th>
                    <th>University</th>
                    <th>Computed</th>
                    <th>Status</th>
                    <th class="num">Amount</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($payables as $payable)
                    <tr>
                        <td>
                            {{ $payable->commission?->application?->student?->full_name ?? '—' }}
                            <span class="sub">{{ $payable->commission?->application?->student?->student_code ?? '' }}</span>
                        </td>
                        <td>{{ $payable->commission?->university?->name ?? '—' }}</td>
                        <td>{{ $payable->computed_at?->format('d M Y') ?? '—' }}</td>
                        <td><span class="status {{ $payable->status }}">{{ $payable->status }}</span></td>
                        <td class="num">{{ $money($payable->amount) }}</td>
                    </tr>
                @empty
                    <tr><td colspan="5" style="color: #64748B; padding: 16px 12px;">No commission entries yet.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="footer">
        <table>
            <tr>
                <td>CAS — Consultancy for Abroad Study &middot; www.cas.moe</td>
                <td class="right">Statement of the agent's own commission share &middot; generated {{ $generatedOn }}.</td>
            </tr>
        </table>
    </div>
</body>
</html>

<table style="width: 100%; margin: 4px 0 8px; border-collapse: collapse;">
    <tr><td style="width: 32%; color: #64748B; padding: 2px 0;">Bank</td><td><strong>{{ $bank->bank_name }}</strong></td></tr>
    <tr><td style="color: #64748B; padding: 2px 0;">Account name</td><td>{{ $bank->account_name }}</td></tr>
    <tr><td style="color: #64748B; padding: 2px 0;">Account number</td><td>{{ $bank->account_number }}</td></tr>
    @if ($bank->iban)
        <tr><td style="color: #64748B; padding: 2px 0;">IBAN</td><td>{{ $bank->iban }}</td></tr>
    @endif
    @if ($bank->swift)
        <tr><td style="color: #64748B; padding: 2px 0;">SWIFT / BIC</td><td>{{ $bank->swift }}</td></tr>
    @endif
    @if ($bank->bank_address)
        <tr><td style="color: #64748B; padding: 2px 0;">Bank address</td><td>{{ $bank->bank_address }}</td></tr>
    @endif
</table>
@if ($bank->instructions)
    <div style="margin-bottom: 6px;">{!! nl2br(e($bank->instructions)) !!}</div>
@endif

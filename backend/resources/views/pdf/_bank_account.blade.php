@php($qr = $bank->qrCodeDataUri())
<table class="bank">
    <tr>
        <td class="bank-details">
            <table class="kv">
                <tr><td class="k">Bank</td><td class="v"><strong>{{ $bank->bank_name }}</strong></td></tr>
                <tr><td class="k">Account name</td><td class="v">{{ $bank->account_name }}</td></tr>
                <tr><td class="k">Account number</td><td class="v">{{ $bank->account_number }}</td></tr>
                @if ($bank->iban)
                    <tr><td class="k">IBAN</td><td class="v">{{ $bank->iban }}</td></tr>
                @endif
                @if ($bank->swift)
                    <tr><td class="k">SWIFT / BIC</td><td class="v">{{ $bank->swift }}</td></tr>
                @endif
                @if ($bank->bank_address)
                    <tr><td class="k">Bank address</td><td class="v">{{ $bank->bank_address }}</td></tr>
                @endif
            </table>
        </td>
        @if ($qr)
            <td class="bank-qr">
                <img src="{{ $qr }}" alt="Payment QR code">
                <div>Scan to pay</div>
            </td>
        @endif
    </tr>
</table>
@if ($bank->instructions)
    <div class="bank-note">{!! nl2br(e($bank->instructions)) !!}</div>
@endif

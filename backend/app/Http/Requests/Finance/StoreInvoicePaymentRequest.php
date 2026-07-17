<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoicePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // policy-checked in the controller
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $invoice = $this->route('invoice');
        $remaining = $invoice ? (float) $invoice->total - (float) $invoice->amount_paid : PHP_FLOAT_MAX;

        return [
            'amount' => ['required', 'numeric', 'min:0.01', "max:{$remaining}"],
            'method' => ['nullable', 'string', 'max:40'],
            'reference' => ['nullable', 'string', 'max:120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'amount.max' => 'Payment exceeds the remaining balance — record an adjusting entry instead.',
        ];
    }
}

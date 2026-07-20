<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRefundRequest extends FormRequest
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
        $paid = $invoice ? (float) $invoice->amount_paid : 0;

        return [
            'amount' => ['required', 'numeric', 'min:0.01', "max:{$paid}"],
            'reference' => ['required', 'string', 'max:120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'amount.max' => 'Refund exceeds the amount paid on this invoice.',
            'reference.required' => 'A reason is required when recording a refund.',
        ];
    }
}

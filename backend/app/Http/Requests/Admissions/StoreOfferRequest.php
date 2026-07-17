<?php

namespace App\Http\Requests\Admissions;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOfferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'offer_type' => ['required', Rule::in(['conditional', 'unconditional'])],
            'reference_no' => ['nullable', 'string', 'max:80'],
            'issued_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date', 'after_or_equal:issued_date'],
            'document_id' => ['nullable', 'integer', Rule::exists('documents', 'id')],
        ];
    }
}

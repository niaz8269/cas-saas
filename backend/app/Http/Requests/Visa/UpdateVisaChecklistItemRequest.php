<?php

namespace App\Http\Requests\Visa;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVisaChecklistItemRequest extends FormRequest
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
            'status' => ['required', Rule::in(['pending', 'received', 'verified'])],
            'document_id' => ['nullable', 'integer', Rule::exists('documents', 'id')],
        ];
    }
}

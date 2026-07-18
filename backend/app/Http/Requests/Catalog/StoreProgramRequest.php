<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProgramRequest extends FormRequest
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
            'university_id' => ['required', 'integer', Rule::exists('universities', 'id')],
            'name' => ['required', 'string', 'max:190'],
            'level' => ['required', Rule::in(['bachelor', 'master', 'phd'])],
            'teaching_language' => ['nullable', 'string', 'max:60'],
            'duration_months' => ['nullable', 'integer', 'min:1', 'max:120'],
            'tuition_fee' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'apply_link' => ['nullable', 'string', 'max:255'],
            'requirements' => ['nullable', 'array'],
            'service_charges' => ['nullable', 'array'],
            'service_charges.currency' => ['nullable', 'string', 'size:3'],
            'service_charges.self.student' => ['nullable', 'numeric', 'min:0'],
            'service_charges.self.agent' => ['nullable', 'numeric', 'min:0'],
            'service_charges.scholarship.student' => ['nullable', 'numeric', 'min:0'],
            'service_charges.scholarship.agent' => ['nullable', 'numeric', 'min:0'],
            'service_charges.partial.student' => ['nullable', 'numeric', 'min:0'],
            'service_charges.partial.agent' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }
}

<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUniversityRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:190'],
            'code' => ['required', 'string', 'max:40', Rule::unique('universities', 'code')->ignore($this->route('university'))],
            'country_id' => ['nullable', 'integer', Rule::exists('countries', 'id')],
            'city' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'string', 'max:190'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }
}

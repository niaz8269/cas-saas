<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWebsiteSourceRequest extends FormRequest
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
            'domain' => ['required', 'string', 'max:190', Rule::unique('website_sources', 'domain')],
            'university_focus' => ['nullable', 'string', 'max:190'],
            'api_source_id' => ['nullable', 'integer', Rule::exists('api_sources', 'id')],
            'is_active' => ['boolean'],
        ];
    }
}

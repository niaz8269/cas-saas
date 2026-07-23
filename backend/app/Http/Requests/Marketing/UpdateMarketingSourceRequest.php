<?php

namespace App\Http\Requests\Marketing;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMarketingSourceRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'channel' => ['nullable', 'string', 'max:60'],
            'is_active' => ['boolean'],
        ];
    }
}

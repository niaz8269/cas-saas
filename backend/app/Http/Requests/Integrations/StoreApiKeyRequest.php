<?php

namespace App\Http\Requests\Integrations;

use Illuminate\Foundation\Http\FormRequest;

class StoreApiKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gated by permission:settings.manage.global,staff on the route
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'rate_limit' => ['nullable', 'integer', 'min:1', 'max:100000'],
        ];
    }
}

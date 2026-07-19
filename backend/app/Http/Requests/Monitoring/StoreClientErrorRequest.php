<?php

namespace App\Http\Requests\Monitoring;

use Illuminate\Foundation\Http\FormRequest;

/**
 * A browser error reported by the SPA. Authenticated (any guard) + throttled on
 * the route; nothing sensitive is trusted from the payload.
 */
class StoreClientErrorRequest extends FormRequest
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
            'name' => ['nullable', 'string', 'max:190'],
            'message' => ['required', 'string', 'max:2000'],
            'source' => ['nullable', 'string', 'max:500'],
            'line' => ['nullable', 'integer', 'min:0'],
            'url' => ['nullable', 'string', 'max:500'],
            'stack' => ['nullable', 'string', 'max:10000'],
        ];
    }
}

<?php

namespace App\Http\Requests\Crm;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNoteRequest extends FormRequest
{
    /** Manually loggable activity kinds (system/status entries are written by the app, not users). */
    public const TYPES = ['note', 'call', 'email', 'meeting'];

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
            'body' => ['required', 'string', 'max:5000'],
            'type' => ['sometimes', Rule::in(self::TYPES)],
        ];
    }
}

<?php

namespace App\Http\Requests\Comms;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TestMessageTemplateRequest extends FormRequest
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
            'channel' => ['required', Rule::in(['email', 'whatsapp', 'sms', 'in_app'])],
            'to' => ['nullable', 'email', 'max:255'],
        ];
    }
}

<?php

namespace App\Http\Requests\Comms;

use App\Services\Comms\Templates;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendCommunicationRequest extends FormRequest
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
            'channel' => ['required', Rule::in(['email', 'whatsapp', 'sms', 'in_app'])],
            'template' => ['required', Rule::in(array_keys(Templates::TEMPLATES))],
            'data' => ['sometimes', 'array'],
            'body' => ['required_if:template,custom', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'body.required_if' => 'A message body is required for a custom message.',
        ];
    }
}

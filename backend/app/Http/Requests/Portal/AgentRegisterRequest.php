<?php

namespace App\Http\Requests\Portal;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Public agent/partner registration payload. Creates a PENDING agent request
 * (no token, not activated) for admin review — approval flips status to
 * 'active'. Email must not already belong to an agent.
 */
class AgentRegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // public endpoint (rate-limited at the route)
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:180'],
            'contact_name' => ['required', 'string', 'max:150'],
            'email' => [
                'required', 'string', 'email', 'max:190',
                Rule::unique('agents', 'email')->whereNull('deleted_at'),
            ],
            'phone' => ['required', 'string', 'max:30'],
            'website' => ['required', 'string', 'max:190'],
            'address' => ['required', 'string', 'max:255'],
            'country_id' => ['required', 'integer', Rule::exists('countries', 'id')],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
            'device_name' => ['sometimes', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => 'A partner account with this email already exists. Try signing in, or contact CAS.',
        ];
    }
}

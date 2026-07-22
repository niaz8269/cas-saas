<?php

namespace App\Http\Requests\Portal;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Public student self-registration payload. Creates a brand-new student portal
 * account, so the email must not already belong to a student (email is indexed
 * but not DB-unique — uniqueness is enforced here). A pre-existing record that
 * still needs a password is NOT activated through this endpoint, since without
 * email verification that would be an account-takeover vector.
 */
class StudentRegisterRequest extends FormRequest
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
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => [
                'required', 'string', 'email', 'max:190',
                Rule::unique('students', 'email')->whereNull('deleted_at'),
            ],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
            'phone' => ['nullable', 'string', 'max:30'],
            'country_id' => ['nullable', 'integer', Rule::exists('countries', 'id')],
            'device_name' => ['sometimes', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => 'An account with this email already exists. Try signing in, or contact your counselor to activate your account.',
        ];
    }
}

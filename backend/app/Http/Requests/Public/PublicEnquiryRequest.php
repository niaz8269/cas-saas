<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublicEnquiryRequest extends FormRequest
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
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:190', 'required_without:phone'],
            'phone' => ['nullable', 'string', 'max:30', 'required_without:email'],
            'country' => ['nullable', 'string', 'size:2', Rule::exists('countries', 'iso2')],
            'message' => ['nullable', 'string', 'max:2000'],
            'interested_university_id' => ['nullable', 'integer', Rule::exists('universities', 'id')],
            'interested_program_id' => ['nullable', 'integer', Rule::exists('programs', 'id')],
            'source_url' => ['nullable', 'string', 'max:255'],
            // Honeypot: a hidden field real users leave empty (spam guard).
            'company' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required_without' => 'Please provide an email or a phone number.',
            'phone.required_without' => 'Please provide an email or a phone number.',
        ];
    }
}

<?php

namespace App\Http\Requests\Ingest;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IngestLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // authenticated by the api-source middleware
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:190', 'required_without:phone'],
            'phone' => ['nullable', 'string', 'max:30', 'required_without:email'],
            'passport_no' => ['nullable', 'string', 'max:50'],
            'dob' => ['nullable', 'date'],
            'country' => ['nullable', 'string', 'size:2', Rule::exists('countries', 'iso2')],
            'intake_route' => ['sometimes', Rule::in(['info', 'full'])],
            'website_domain' => ['nullable', 'string', 'max:190'],
            'campaign_utm' => ['nullable', 'string', 'max:120'],
            'message' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required_without' => 'Provide at least an email or a phone number.',
            'phone.required_without' => 'Provide at least an email or a phone number.',
        ];
    }
}

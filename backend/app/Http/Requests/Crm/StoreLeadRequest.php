<?php

namespace App\Http\Requests\Crm;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A lead added by staff (admin / counselor / marketing). Needs a name and at
 * least one way to reach them; source and assignee are optional.
 */
class StoreLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // policy check runs in the controller
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'required_without:phone', 'email', 'max:190'],
            'phone' => ['nullable', 'required_without:email', 'string', 'max:30'],
            'country_id' => ['nullable', 'integer', Rule::exists('countries', 'id')],
            'marketing_source_id' => ['nullable', 'integer', Rule::exists('marketing_sources', 'id')],
            'assigned_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'intake_route' => ['nullable', Rule::in(['info', 'full'])],
            'message' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required_without' => 'Provide an email or a phone number.',
            'phone.required_without' => 'Provide an email or a phone number.',
        ];
    }
}

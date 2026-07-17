<?php

namespace App\Http\Requests\Crm;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLeadRequest extends FormRequest
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
            'first_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'last_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'email' => ['sometimes', 'nullable', 'email', 'max:190'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'passport_no' => ['sometimes', 'nullable', 'string', 'max:50'],
            'country_id' => ['sometimes', 'nullable', 'integer', Rule::exists('countries', 'id')],
            // Workflow-engine guards arrive in M8; conversion/duplicate states
            // are owned by their dedicated flows, never set directly.
            'status' => ['sometimes', Rule::in(['new', 'assigned', 'contacted', 'qualified', 'unqualified', 'lost'])],
            'message' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }
}

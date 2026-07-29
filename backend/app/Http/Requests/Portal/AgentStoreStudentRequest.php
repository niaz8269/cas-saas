<?php

namespace App\Http\Requests\Portal;

use App\Http\Requests\Crm\StoreStudentRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Partner "add student" submission (report §5.7 — "submit students").
 *
 * Mirrors the staff {@see StoreStudentRequest} field set.
 * `agent_id`, `student_code` and `status` are deliberately absent: they are
 * derived server-side from the acting agent, never accepted from the client.
 */
class AgentStoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // scope is the agent guard — the token IS the scope
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:30'],
            'passport_no' => ['nullable', 'string', 'max:50'],
            'dob' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'country_id' => ['nullable', 'integer', Rule::exists('countries', 'id')],
        ];
    }
}

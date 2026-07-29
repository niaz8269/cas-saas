<?php

namespace App\Http\Requests\Portal;

use App\Http\Requests\Portal\Concerns\ValidatesApplicantData;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Partner "add student" submission (report §5.7 — "submit students").
 *
 * Identity (the two names + the contact email) plus the SAME applicant record
 * an application is built from — profile, guardians, prior education — so the
 * partner enters each fact once and the apply wizard can prefill from it.
 *
 * `agent_id`, `student_code` and `status` are deliberately absent: they are
 * derived server-side from the acting agent, never accepted from the client.
 */
class AgentStoreStudentRequest extends FormRequest
{
    use ValidatesApplicantData;

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

            ...$this->applicantDataRules(),
        ];
    }
}

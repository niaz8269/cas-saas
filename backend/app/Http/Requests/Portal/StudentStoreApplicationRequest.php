<?php

namespace App\Http\Requests\Portal;

use App\Http\Requests\Portal\Concerns\ValidatesApplicantData;
use App\Services\Admissions\ApplicationCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The student self-apply wizard payload: program choice + funding, plus the
 * applicant's own profile, guardians and prior education. Identity fields
 * (name, email — the portal login) are deliberately not accepted here.
 */
class StudentStoreApplicationRequest extends FormRequest
{
    use ValidatesApplicantData;

    public function authorize(): bool
    {
        return true; // the student guard is the scope
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'program_id' => ['required', 'integer', Rule::exists('programs', 'id')],
            'scholarship_id' => ['nullable', 'integer', Rule::exists('scholarships', 'id')],
            'intake_id' => ['nullable', 'integer', Rule::exists('intakes', 'id')],
            'funding' => ['required', Rule::in(ApplicationCatalog::FUNDING)],

            // Answers to the course's admin-defined custom fields; validated in
            // detail server-side against the program's spec (report item 11).
            'custom_fields' => ['sometimes', 'array'],
            'custom_fields.*' => ['nullable', 'string', 'max:5000'],

            ...$this->applicantDataRules(),
        ];
    }
}

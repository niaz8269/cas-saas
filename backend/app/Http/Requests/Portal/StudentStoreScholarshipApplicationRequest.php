<?php

namespace App\Http\Requests\Portal;

use App\Http\Requests\Portal\Concerns\ValidatesApplicantData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A general government-scholarship application: a degree level, the
 * scholarship, up to three major/university preferences, plus the applicant's
 * own profile / guardians / education. No exact program or university.
 */
class StudentStoreScholarshipApplicationRequest extends FormRequest
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
            'scholarship_id' => ['required', 'integer', Rule::exists('scholarships', 'id')],
            'level' => ['required', Rule::in(['bachelor', 'master', 'phd'])],
            'preferences' => ['sometimes', 'array', 'max:3'],
            'preferences.*.major' => ['required', 'string', 'max:150'],
            'preferences.*.university_id' => ['nullable', 'integer', Rule::exists('universities', 'id')],

            ...$this->applicantDataRules(),
        ];
    }
}

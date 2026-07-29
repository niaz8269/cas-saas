<?php

namespace App\Http\Requests\Portal\Concerns;

use Illuminate\Validation\Rule;

/**
 * The applicant record an application is built from: personal profile,
 * family/guardians and prior education (report §5.4).
 *
 * Shared verbatim by every portal surface that captures it — the student and
 * agent apply wizards, the government-scholarship variants, and the partner's
 * "add student" form — so the same facts are accepted the same way wherever
 * they are entered. Identity fields (first/last name, the login email) are
 * NOT here: they belong to whichever request owns creating the student.
 */
trait ValidatesApplicantData
{
    /**
     * @return array<string, array<int, mixed>>
     */
    protected function applicantDataRules(): array
    {
        return [
            'profile' => ['sometimes', 'array'],
            'profile.chinese_name' => ['nullable', 'string', 'max:120'],
            'profile.native_language' => ['nullable', 'string', 'max:60'],
            'profile.alternate_email' => ['nullable', 'email', 'max:190'],
            'profile.wechat_id' => ['nullable', 'string', 'max:80'],
            'profile.skype_id' => ['nullable', 'string', 'max:80'],
            'profile.phone' => ['nullable', 'string', 'max:30'],
            'profile.passport_no' => ['nullable', 'string', 'max:50'],
            'profile.passport_issue_date' => ['nullable', 'date'],
            'profile.passport_expiry_date' => ['nullable', 'date', 'after:profile.passport_issue_date'],
            'profile.dob' => ['nullable', 'date', 'before:today'],
            'profile.place_of_birth' => ['nullable', 'string', 'max:120'],
            'profile.gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'profile.marital_status' => ['nullable', 'string', 'max:20'],
            'profile.religion' => ['nullable', 'string', 'max:60'],
            'profile.english_test' => ['nullable', 'string', 'max:30'],
            'profile.english_test_score' => ['nullable', 'string', 'max:30'],
            'profile.english_test_date' => ['nullable', 'date'],
            'profile.permanent_address' => ['nullable', 'string', 'max:255'],
            'profile.current_address' => ['nullable', 'string', 'max:255'],
            'profile.city' => ['nullable', 'string', 'max:120'],
            'profile.postal_code' => ['nullable', 'string', 'max:20'],
            'profile.country_id' => ['nullable', 'integer', Rule::exists('countries', 'id')],

            'guardians' => ['sometimes', 'array', 'max:5'],
            'guardians.*.relation' => ['required', 'string', 'max:50'],
            'guardians.*.name' => ['required', 'string', 'max:150'],
            'guardians.*.occupation' => ['nullable', 'string', 'max:120'],
            'guardians.*.phone' => ['nullable', 'string', 'max:30'],
            'guardians.*.email' => ['nullable', 'email', 'max:190'],
            'guardians.*.address' => ['nullable', 'string', 'max:255'],

            'education' => ['sometimes', 'array', 'max:6'],
            'education.*.level' => ['nullable', 'string', 'max:40'],
            'education.*.degree_name' => ['required', 'string', 'max:150'],
            'education.*.institution' => ['nullable', 'string', 'max:190'],
            'education.*.board_or_university' => ['nullable', 'string', 'max:190'],
            'education.*.country_id' => ['nullable', 'integer', Rule::exists('countries', 'id')],
            'education.*.major' => ['nullable', 'string', 'max:150'],
            'education.*.start_year' => ['nullable', 'integer', 'min:1950', 'max:2100'],
            'education.*.end_year' => ['nullable', 'integer', 'min:1950', 'max:2100'],
            'education.*.grade_type' => ['nullable', Rule::in(['gpa', 'cgpa', 'percentage', 'grade'])],
            'education.*.grade_value' => ['nullable', 'string', 'max:30'],
            'education.*.is_completed' => ['boolean'],
        ];
    }
}

<?php

namespace App\Http\Requests\Admissions;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreApplicationRequest extends FormRequest
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
        $universityId = $this->input('university_id');

        return [
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')->whereNull('deleted_at')],
            'university_id' => ['required', 'integer', Rule::exists('universities', 'id')->whereNull('deleted_at')],
            'program_id' => ['required', 'integer', Rule::exists('programs', 'id')->where('university_id', $universityId)],
            'intake_id' => ['nullable', 'integer', Rule::exists('intakes', 'id')->where('university_id', $universityId)],
            'scholarship_id' => ['nullable', 'integer', Rule::exists('scholarships', 'id')->where('university_id', $universityId)],
            'agent_id' => ['nullable', 'integer', Rule::exists('agents', 'id')],
            'assigned_admissions_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
        ];
    }
}

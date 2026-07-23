<?php

namespace App\Http\Requests\Admissions;

use App\Services\Auth\ScopeResolver;
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

        // A non-global creator (Counselor, applications.create.assigned) may
        // only file for a student on their own caseload; global creators
        // (Admissions/Ops) are unrestricted.
        $studentExists = Rule::exists('students', 'id')->whereNull('deleted_at');
        if (app(ScopeResolver::class)->resolve($this->user(), 'applications', 'create') !== 'global') {
            $studentExists->where('assigned_counselor_id', $this->user()->id);
        }

        return [
            'student_id' => ['required', 'integer', $studentExists],
            'university_id' => ['required', 'integer', Rule::exists('universities', 'id')->whereNull('deleted_at')],
            'program_id' => ['required', 'integer', Rule::exists('programs', 'id')->where('university_id', $universityId)],
            'intake_id' => ['nullable', 'integer', Rule::exists('intakes', 'id')->where('university_id', $universityId)],
            'scholarship_id' => ['nullable', 'integer', Rule::exists('scholarships', 'id')->where('university_id', $universityId)],
            'agent_id' => ['nullable', 'integer', Rule::exists('agents', 'id')],
            'assigned_admissions_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
        ];
    }
}

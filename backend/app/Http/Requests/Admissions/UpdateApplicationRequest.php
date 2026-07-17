<?php

namespace App\Http\Requests\Admissions;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Non-lifecycle fields only — status changes go through /transition.
 */
class UpdateApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $universityId = $this->route('application')?->university_id;

        return [
            'intake_id' => ['sometimes', 'nullable', 'integer', Rule::exists('intakes', 'id')->where('university_id', $universityId)],
            'scholarship_id' => ['sometimes', 'nullable', 'integer', Rule::exists('scholarships', 'id')->where('university_id', $universityId)],
            'assigned_admissions_id' => ['sometimes', 'nullable', 'integer', Rule::exists('users', 'id')],
        ];
    }
}

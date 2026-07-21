<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProgramRequest extends FormRequest
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
        return [
            'university_id' => ['required', 'integer', Rule::exists('universities', 'id')],
            'name' => ['required', 'string', 'max:190'],
            'level' => ['required', Rule::in(['bachelor', 'master', 'phd'])],
            'teaching_language' => ['nullable', 'string', 'max:60'],
            'duration_months' => ['nullable', 'integer', 'min:1', 'max:120'],
            'tuition_fee' => ['nullable', 'numeric', 'min:0'],
            'hostel_fee' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'apply_link' => ['nullable', 'string', 'max:255'],
            'scholarship_ids' => ['nullable', 'array'],
            'scholarship_ids.*' => ['integer', Rule::exists('scholarships', 'id')],
            'requirements' => ['nullable', 'array'],
            'requirements.documents' => ['nullable', 'array'],
            'requirements.documents.*' => ['integer', Rule::exists('document_types', 'id')],
            'requirements.sections' => ['nullable', 'array'],
            'requirements.sections.work_experience' => ['nullable', 'boolean'],
            'requirements.sections.research' => ['nullable', 'boolean'],
            'requirements.sections.study_plan' => ['nullable', 'boolean'],
            'requirements.sections.intro_video' => ['nullable', 'boolean'],
            // Admin-defined custom application fields (report item 11). The
            // applicant's answers are validated server-side against this spec.
            'requirements.fields' => ['nullable', 'array', 'max:30'],
            'requirements.fields.*.key' => ['required', 'string', 'max:60', 'regex:/^[a-z][a-z0-9_]*$/', 'distinct'],
            'requirements.fields.*.label' => ['required', 'string', 'max:120'],
            'requirements.fields.*.type' => ['required', Rule::in(['text', 'textarea', 'number', 'date', 'select'])],
            'requirements.fields.*.required' => ['boolean'],
            'requirements.fields.*.options' => ['nullable', 'array'],
            'requirements.fields.*.options.*' => ['string', 'max:120'],
            'service_charges' => ['nullable', 'array'],
            'service_charges.currency' => ['nullable', 'string', 'size:3'],
            'service_charges.self.student' => ['nullable', 'numeric', 'min:0'],
            'service_charges.self.agent' => ['nullable', 'numeric', 'min:0'],
            'service_charges.scholarships' => ['nullable', 'array'],
            'service_charges.scholarships.*.scholarship_id' => ['required_with:service_charges.scholarships', 'integer'],
            'service_charges.scholarships.*.student' => ['nullable', 'numeric', 'min:0'],
            'service_charges.scholarships.*.agent' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }
}

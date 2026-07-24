<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreScholarshipRequest extends FormRequest
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
            'scope' => ['nullable', Rule::in(['university', 'government'])],
            'university_id' => ['nullable', 'required_unless:scope,government', 'integer', Rule::exists('universities', 'id')],
            'name' => ['required', 'string', 'max:190'],
            'slug' => ['nullable', 'string', 'max:190', 'regex:/^[a-z0-9-]+$/', Rule::unique('scholarships', 'slug')->ignore($this->route('scholarship'))],
            'type' => ['nullable', 'string', 'max:60'],
            'coverage' => ['nullable', 'string', 'max:120'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'tuition_after' => ['nullable', 'numeric', 'min:0'],
            'hostel_after' => ['nullable', 'numeric', 'min:0'],
            'stipend_monthly' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'criteria' => ['nullable', 'array'],
            'description' => ['nullable', 'string', 'max:20000'],
            'eligibility' => ['nullable', 'string', 'max:20000'],
            'how_to_apply' => ['nullable', 'string', 'max:20000'],
            'apply_link' => ['nullable', 'string', 'max:255'],
            'deadline' => ['nullable', 'date'],

            // Government scope: universities that enrol under the award, and
            // per-degree-level benefits.
            'university_ids' => ['nullable', 'array'],
            'university_ids.*' => ['integer', Rule::exists('universities', 'id')],
            'benefits' => ['nullable', 'array'],
            'benefits.bachelor' => ['nullable', 'array'],
            'benefits.master' => ['nullable', 'array'],
            'benefits.phd' => ['nullable', 'array'],
            'benefits.*.tuition_after' => ['nullable', 'numeric', 'min:0'],
            'benefits.*.hostel_after' => ['nullable', 'numeric', 'min:0'],
            'benefits.*.stipend_monthly' => ['nullable', 'numeric', 'min:0'],

            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            // Per-audience visibility config (sanitized to gateable sections on save).
            'visibility' => ['nullable', 'array'],
            'visibility.*' => ['array'],
            'visibility.*.*' => ['string', Rule::in(['public', 'student', 'agent', 'counselor'])],
        ];
    }
}

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
            'university_id' => ['required', 'integer', Rule::exists('universities', 'id')],
            'name' => ['required', 'string', 'max:190'],
            'slug' => ['nullable', 'string', 'max:190', 'regex:/^[a-z0-9-]+$/', Rule::unique('scholarships', 'slug')->ignore($this->route('scholarship'))],
            'type' => ['nullable', 'string', 'max:60'],
            'coverage' => ['nullable', 'string', 'max:120'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'criteria' => ['nullable', 'array'],
            'description' => ['nullable', 'string', 'max:20000'],
            'eligibility' => ['nullable', 'string', 'max:20000'],
            'how_to_apply' => ['nullable', 'string', 'max:20000'],
            'apply_link' => ['nullable', 'string', 'max:255'],
            'deadline' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }
}

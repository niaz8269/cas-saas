<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Validation\Rule;

class UpdateScholarshipRequest extends StoreScholarshipRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $rules = array_map(
            fn (array $rules) => array_map(fn ($rule) => $rule === 'required' ? 'sometimes' : $rule, $rules),
            parent::rules(),
        );

        // Partial edits shouldn't re-require the university (required_unless
        // survives the 'required' swap above).
        $rules['university_id'] = ['sometimes', 'nullable', 'integer', Rule::exists('universities', 'id')];

        return $rules;
    }
}

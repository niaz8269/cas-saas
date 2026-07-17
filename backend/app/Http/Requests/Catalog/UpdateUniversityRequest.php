<?php

namespace App\Http\Requests\Catalog;

class UpdateUniversityRequest extends StoreUniversityRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return array_map(
            fn (array $rules) => array_map(fn ($rule) => $rule === 'required' ? 'sometimes' : $rule, $rules),
            parent::rules(),
        );
    }
}

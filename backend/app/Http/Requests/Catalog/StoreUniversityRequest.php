<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUniversityRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:190'],
            'code' => ['required', 'string', 'max:40', Rule::unique('universities', 'code')->ignore($this->route('university'))],
            'slug' => ['nullable', 'string', 'max:190', 'regex:/^[a-z0-9-]+$/', Rule::unique('universities', 'slug')->ignore($this->route('university'))],
            'country_id' => ['nullable', 'integer', Rule::exists('countries', 'id')],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'string', 'max:190'],
            'apply_link' => ['nullable', 'string', 'max:255'],
            'logo_path' => ['nullable', 'string', 'max:500'],
            'cover_path' => ['nullable', 'string', 'max:500'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'moe_listed' => ['sometimes', 'boolean'],
            'nearest_airport' => ['nullable', 'string', 'max:150'],
            'about' => ['nullable', 'string', 'max:20000'],
            'requirements' => ['nullable', 'array'],
            'requirements.*' => ['string', 'max:255'],
            'representative_professor' => ['nullable', 'array'],
            'representative_professor.name' => ['nullable', 'string', 'max:150'],
            'representative_professor.title' => ['nullable', 'string', 'max:150'],
            'representative_professor.photo' => ['nullable', 'string', 'max:500'],
        ];
    }
}

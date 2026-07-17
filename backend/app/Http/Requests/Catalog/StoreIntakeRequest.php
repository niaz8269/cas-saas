<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIntakeRequest extends FormRequest
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
        $universityId = $this->input('university_id') ?? $this->route('intake')?->university_id;

        return [
            'university_id' => ['required', 'integer', Rule::exists('universities', 'id')],
            'program_id' => [
                'nullable', 'integer',
                Rule::exists('programs', 'id')->where('university_id', $universityId),
            ],
            'name' => ['required', 'string', 'max:80'],
            'start_date' => ['nullable', 'date'],
            'application_deadline' => ['nullable', 'date', 'before_or_equal:start_date'],
            'seats' => ['nullable', 'integer', 'min:0'],
            'status' => ['sometimes', Rule::in(['open', 'closed'])],
        ];
    }
}

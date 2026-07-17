<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUniversityAgreementRequest extends FormRequest
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
        $universityId = $this->input('university_id') ?? $this->route('agreement')?->university_id;

        return [
            'university_id' => ['required', 'integer', Rule::exists('universities', 'id')],
            'program_id' => [
                'nullable', 'integer',
                Rule::exists('programs', 'id')->where('university_id', $universityId),
            ],
            'commission_type' => ['required', Rule::in(['fixed', 'percent', 'tiered'])],
            'commission_value' => [
                'required', 'numeric', 'min:0',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if ($this->input('commission_type') === 'percent' && (float) $value > 100) {
                        $fail('Percent commission cannot exceed 100.');
                    }
                },
            ],
            'currency' => ['nullable', 'required_if:commission_type,fixed', 'string', 'size:3'],
            'eligibility_trigger' => ['sometimes', 'string', 'max:60'],
            'valid_from' => ['nullable', 'date'],
            'valid_to' => ['nullable', 'date', 'after_or_equal:valid_from'],
        ];
    }
}

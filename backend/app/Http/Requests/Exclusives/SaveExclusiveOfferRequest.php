<?php

namespace App\Http\Requests\Exclusives;

use App\Models\ExclusiveOffer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveExclusiveOfferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gated by the route permission
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        // The commission is a fixed amount in RMB for each agency level.
        $rate = fn (string $level) => [
            "commission_rates.$level" => ['nullable', 'array'],
            "commission_rates.$level.value" => ['nullable', 'numeric', 'min:0', 'max:100000000'],
        ];

        return array_merge([
            'title' => ['required', 'string', 'max:200'],
            'offer_type' => ['required', Rule::in(ExclusiveOffer::TYPES)],
            'audience' => ['required', Rule::in(ExclusiveOffer::AUDIENCES)],
            'university_id' => ['nullable', 'integer', 'exists:universities,id'],
            'program_id' => ['nullable', 'integer', 'exists:programs,id'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'commission_rates' => ['nullable', 'array'],
            'commission_notes' => ['nullable', 'string', 'max:4000'],
            'fee_structure' => ['nullable', 'array', 'max:30'],
            'fee_structure.*.label' => ['required', 'string', 'max:120'],
            'fee_structure.*.amount' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
            'fee_structure.*.currency' => ['nullable', 'string', 'size:3'],
            'fee_structure.*.note' => ['nullable', 'string', 'max:200'],
            'fee_notes' => ['nullable', 'string', 'max:4000'],
            'eligible_nationalities' => ['nullable', 'array', 'max:250'],
            'eligible_nationalities.*' => ['string', 'max:80'],
            'restricted_nationalities' => ['nullable', 'array', 'max:250'],
            'restricted_nationalities.*' => ['string', 'max:80'],
            'nationality_notes' => ['nullable', 'string', 'max:4000'],
            'conditions' => ['nullable', 'string', 'max:8000'],
            'status' => ['required', Rule::in(['draft', 'published'])],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
        ], ...array_map($rate, ExclusiveOffer::LEVELS));
    }
}

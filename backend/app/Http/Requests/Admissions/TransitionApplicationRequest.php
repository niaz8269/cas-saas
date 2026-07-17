<?php

namespace App\Http\Requests\Admissions;

use App\Services\Admissions\ApplicationWorkflow;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransitionApplicationRequest extends FormRequest
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
            'status' => ['required', Rule::in(array_keys(ApplicationWorkflow::TRANSITIONS))],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }
}

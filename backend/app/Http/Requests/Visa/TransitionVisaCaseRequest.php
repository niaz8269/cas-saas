<?php

namespace App\Http\Requests\Visa;

use App\Services\Visa\VisaWorkflow;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransitionVisaCaseRequest extends FormRequest
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
            'status' => ['required', Rule::in(array_keys(VisaWorkflow::TRANSITIONS))],
            'note' => ['nullable', 'string', 'max:500'],
            'appointment_at' => ['nullable', 'date'],
        ];
    }
}

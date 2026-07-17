<?php

namespace App\Http\Requests\Crm;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignLeadRequest extends FormRequest
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
            'assigned_user_id' => [
                'required', 'integer',
                Rule::exists('users', 'id')->whereNull('deleted_at')->where('status', 'active'),
            ],
        ];
    }
}

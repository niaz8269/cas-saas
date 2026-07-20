<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
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
        $id = $this->route('user')?->id;

        return [
            'name' => ['sometimes', 'string', 'max:150'],
            'email' => ['sometimes', 'email', 'max:190', Rule::unique('users', 'email')->ignore($id)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            // Optional: only rotates the password when a non-empty value is sent.
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'max:255'],
            'branch_id' => ['sometimes', 'nullable', 'integer', Rule::exists('branches', 'id')],
            'department_id' => ['sometimes', 'nullable', 'integer', Rule::exists('departments', 'id')],
            'status' => ['sometimes', Rule::in(StoreUserRequest::STATUSES)],
            'roles' => ['sometimes', 'array'],
            'roles.*' => ['string', Rule::exists('roles', 'name')->where('guard_name', 'staff')],
        ];
    }
}

<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    /** Account states a user-manager may set. */
    public const STATUSES = ['active', 'inactive', 'suspended'];

    public function authorize(): bool
    {
        // Route is guarded by permission:users.manage.global; the Super-Admin
        // escalation guard lives in the controller (it needs the actor + target).
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'branch_id' => ['nullable', 'integer', Rule::exists('branches', 'id')],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')],
            'status' => ['sometimes', Rule::in(self::STATUSES)],
            'roles' => ['sometimes', 'array'],
            'roles.*' => ['string', Rule::exists('roles', 'name')->where('guard_name', 'staff')],
        ];
    }
}

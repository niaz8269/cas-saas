<?php

namespace App\Policies;

use App\Models\Commission;
use App\Models\User;
use App\Services\Auth\ScopeResolver;

class CommissionPolicy
{
    public function __construct(private readonly ScopeResolver $scopes) {}

    public function viewAny(User $user): bool
    {
        return $this->scopes->resolve($user, 'commission', 'view') !== null;
    }

    public function view(User $user, Commission $commission): bool
    {
        return match ($this->scopes->resolve($user, 'commission', 'view')) {
            'global', 'branch', 'department' => true,
            // Counselor "own": commissions of their students' applications.
            'assigned', 'own' => $commission->application?->student?->assigned_counselor_id === $user->id,
            default => false,
        };
    }

    public function transition(User $user, Commission $commission): bool
    {
        return $user->can('commission.manage.global');
    }
}

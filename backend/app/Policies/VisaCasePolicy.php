<?php

namespace App\Policies;

use App\Models\User;
use App\Models\VisaCase;
use App\Services\Auth\ScopeResolver;

class VisaCasePolicy
{
    public function __construct(private readonly ScopeResolver $scopes) {}

    public function viewAny(User $user): bool
    {
        return $this->scopes->resolve($user, 'visa', 'view') !== null;
    }

    public function view(User $user, VisaCase $case): bool
    {
        return $this->withinScope($user, $case, $this->scopes->resolve($user, 'visa', 'view'));
    }

    public function update(User $user, VisaCase $case): bool
    {
        return $this->withinScope($user, $case, $this->scopes->resolve($user, 'visa', 'manage'));
    }

    private function withinScope(User $user, VisaCase $case, ?string $scope): bool
    {
        return match ($scope) {
            'global', 'branch', 'department' => true,
            'assigned', 'own' => $case->assigned_visa_officer_id === $user->id
                || $case->student?->assigned_counselor_id === $user->id,
            default => false,
        };
    }
}

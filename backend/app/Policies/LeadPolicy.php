<?php

namespace App\Policies;

use App\Models\Lead;
use App\Models\User;
use App\Services\Auth\ScopeResolver;

class LeadPolicy
{
    public function __construct(private readonly ScopeResolver $scopes) {}

    public function viewAny(User $user): bool
    {
        return $this->scopes->resolve($user, 'leads', 'view') !== null;
    }

    public function create(User $user): bool
    {
        return $this->scopes->resolve($user, 'leads', 'create') !== null;
    }

    public function view(User $user, Lead $lead): bool
    {
        return $this->withinScope($user, $lead, $this->scopes->resolve($user, 'leads', 'view'));
    }

    public function update(User $user, Lead $lead): bool
    {
        return $this->withinScope($user, $lead, $this->scopes->resolve($user, 'leads', 'update'));
    }

    public function assign(User $user, Lead $lead): bool
    {
        return $user->can('leads.assign.global');
    }

    public function convert(User $user, Lead $lead): bool
    {
        if (! $user->can('leads.convert.assigned')) {
            return false;
        }

        // Converters act on their own pipeline unless they hold global update.
        return $lead->assigned_user_id === $user->id
            || $this->scopes->resolve($user, 'leads', 'update') === 'global';
    }

    private function withinScope(User $user, Lead $lead, ?string $scope): bool
    {
        return match ($scope) {
            'global' => true,
            'branch' => $lead->assignee?->branch_id !== null
                && $lead->assignee->branch_id === $user->branch_id,
            'department' => $lead->assignee?->department_id !== null
                && $lead->assignee->department_id === $user->department_id,
            'assigned', 'own' => $lead->assigned_user_id === $user->id,
            default => false,
        };
    }
}

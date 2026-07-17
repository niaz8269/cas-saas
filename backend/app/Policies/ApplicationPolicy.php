<?php

namespace App\Policies;

use App\Models\Application;
use App\Models\User;
use App\Services\Auth\ScopeResolver;

class ApplicationPolicy
{
    public function __construct(private readonly ScopeResolver $scopes) {}

    public function viewAny(User $user): bool
    {
        return $this->scopes->resolve($user, 'applications', 'view') !== null;
    }

    public function view(User $user, Application $application): bool
    {
        return $this->withinScope($user, $application, $this->scopes->resolve($user, 'applications', 'view'));
    }

    public function create(User $user): bool
    {
        return $user->can('applications.create.global');
    }

    public function update(User $user, Application $application): bool
    {
        return $this->withinScope($user, $application, $this->scopes->resolve($user, 'applications', 'update'));
    }

    private function withinScope(User $user, Application $application, ?string $scope): bool
    {
        return match ($scope) {
            'global' => true,
            'branch' => $application->student?->branch_id !== null
                && $application->student->branch_id === $user->branch_id,
            'department' => $application->admissionsOfficer?->department_id !== null
                && $application->admissionsOfficer->department_id === $user->department_id,
            'assigned', 'own' => $application->assigned_admissions_id === $user->id
                || $application->student?->assigned_counselor_id === $user->id,
            default => false,
        };
    }
}

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
        // Scope-aware: a global creator (Admissions/Ops) may create for anyone;
        // an assigned creator (Counselor) is narrowed to their own students by
        // StoreApplicationRequest's student_id rule.
        return $this->scopes->resolve($user, 'applications', 'create') !== null;
    }

    public function update(User $user, Application $application): bool
    {
        return $this->withinScope($user, $application, $this->scopes->resolve($user, 'applications', 'update'));
    }

    public function delete(User $user, Application $application): bool
    {
        return $user->can('applications.delete.global');
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

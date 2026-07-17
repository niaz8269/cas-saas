<?php

namespace App\Policies;

use App\Models\Student;
use App\Models\User;
use App\Services\Auth\ScopeResolver;

class StudentPolicy
{
    public function __construct(private readonly ScopeResolver $scopes) {}

    public function viewAny(User $user): bool
    {
        return $this->scopes->resolve($user, 'students', 'view') !== null;
    }

    public function view(User $user, Student $student): bool
    {
        return $this->withinScope($user, $student, $this->scopes->resolve($user, 'students', 'view'));
    }

    public function create(User $user): bool
    {
        return $user->can('students.create.global');
    }

    public function update(User $user, Student $student): bool
    {
        return $this->withinScope($user, $student, $this->scopes->resolve($user, 'students', 'update'));
    }

    private function withinScope(User $user, Student $student, ?string $scope): bool
    {
        return match ($scope) {
            'global' => true,
            'branch' => $student->branch_id !== null && $student->branch_id === $user->branch_id,
            // Students carry no department; department scope falls back to branch.
            'department' => $student->branch_id !== null && $student->branch_id === $user->branch_id,
            'assigned' => $student->assigned_counselor_id === $user->id,
            'own' => $student->created_by === $user->id
                || $student->assigned_counselor_id === $user->id,
            default => false,
        };
    }
}

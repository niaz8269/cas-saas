<?php

namespace App\Policies;

use App\Models\Program;
use App\Models\User;

class ProgramPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('universities.view.global');
    }

    public function view(User $user, Program $program): bool
    {
        return $user->can('universities.view.global');
    }

    public function create(User $user): bool
    {
        return $user->can('universities.manage.global');
    }

    public function update(User $user, Program $program): bool
    {
        return $user->can('universities.manage.global');
    }

    public function delete(User $user, Program $program): bool
    {
        return $user->can('universities.manage.global');
    }
}

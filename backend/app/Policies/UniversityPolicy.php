<?php

namespace App\Policies;

use App\Models\University;
use App\Models\User;

class UniversityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('universities.view.global');
    }

    public function view(User $user, University $university): bool
    {
        return $user->can('universities.view.global');
    }

    public function create(User $user): bool
    {
        return $user->can('universities.manage.global');
    }

    public function update(User $user, University $university): bool
    {
        return $user->can('universities.manage.global');
    }

    public function delete(User $user, University $university): bool
    {
        return $user->can('universities.manage.global');
    }
}

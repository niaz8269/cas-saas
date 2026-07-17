<?php

namespace App\Policies;

use App\Models\Intake;
use App\Models\User;

class IntakePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('universities.view.global');
    }

    public function view(User $user, Intake $intake): bool
    {
        return $user->can('universities.view.global');
    }

    public function create(User $user): bool
    {
        return $user->can('universities.manage.global');
    }

    public function update(User $user, Intake $intake): bool
    {
        return $user->can('universities.manage.global');
    }

    public function delete(User $user, Intake $intake): bool
    {
        return $user->can('universities.manage.global');
    }
}

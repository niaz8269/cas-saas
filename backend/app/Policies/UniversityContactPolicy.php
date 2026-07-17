<?php

namespace App\Policies;

use App\Models\UniversityContact;
use App\Models\User;

class UniversityContactPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('universities.view.global');
    }

    public function view(User $user, UniversityContact $contact): bool
    {
        return $user->can('universities.view.global');
    }

    public function create(User $user): bool
    {
        return $user->can('universities.manage.global');
    }

    public function update(User $user, UniversityContact $contact): bool
    {
        return $user->can('universities.manage.global');
    }

    public function delete(User $user, UniversityContact $contact): bool
    {
        return $user->can('universities.manage.global');
    }
}

<?php

namespace App\Policies;

use App\Models\Scholarship;
use App\Models\User;

class ScholarshipPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('scholarships.view.global');
    }

    public function view(User $user, Scholarship $scholarship): bool
    {
        return $user->can('scholarships.view.global');
    }

    public function create(User $user): bool
    {
        return $user->can('scholarships.manage.global');
    }

    public function update(User $user, Scholarship $scholarship): bool
    {
        return $user->can('scholarships.manage.global');
    }

    public function delete(User $user, Scholarship $scholarship): bool
    {
        return $user->can('scholarships.manage.global');
    }
}

<?php

namespace App\Policies;

use App\Models\Course;
use App\Models\User;

class CoursePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('universities.view.global');
    }

    public function view(User $user, Course $course): bool
    {
        return $user->can('universities.view.global');
    }

    public function create(User $user): bool
    {
        return $user->can('universities.manage.global');
    }

    public function update(User $user, Course $course): bool
    {
        return $user->can('universities.manage.global');
    }

    public function delete(User $user, Course $course): bool
    {
        return $user->can('universities.manage.global');
    }
}

<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WebsiteSource;

class WebsiteSourcePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('marketing.view.global');
    }

    public function view(User $user, WebsiteSource $source): bool
    {
        return $user->can('marketing.view.global');
    }

    public function create(User $user): bool
    {
        return $user->can('marketing.manage.global');
    }

    public function update(User $user, WebsiteSource $source): bool
    {
        return $user->can('marketing.manage.global');
    }

    public function delete(User $user, WebsiteSource $source): bool
    {
        return $user->can('marketing.manage.global');
    }
}

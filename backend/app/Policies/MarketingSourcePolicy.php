<?php

namespace App\Policies;

use App\Models\MarketingSource;
use App\Models\User;

class MarketingSourcePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('marketing.view.global');
    }

    public function view(User $user, MarketingSource $source): bool
    {
        return $user->can('marketing.view.global');
    }

    public function create(User $user): bool
    {
        return $user->can('marketing.manage.global');
    }

    public function update(User $user, MarketingSource $source): bool
    {
        return $user->can('marketing.manage.global');
    }

    public function delete(User $user, MarketingSource $source): bool
    {
        return $user->can('marketing.manage.global');
    }
}

<?php

namespace App\Policies;

use App\Models\Campaign;
use App\Models\User;

class CampaignPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('marketing.view.global');
    }

    public function view(User $user, Campaign $campaign): bool
    {
        return $user->can('marketing.view.global');
    }

    public function create(User $user): bool
    {
        return $user->can('marketing.manage.global');
    }

    public function update(User $user, Campaign $campaign): bool
    {
        return $user->can('marketing.manage.global');
    }

    public function delete(User $user, Campaign $campaign): bool
    {
        return $user->can('marketing.manage.global');
    }
}

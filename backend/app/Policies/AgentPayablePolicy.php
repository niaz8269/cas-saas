<?php

namespace App\Policies;

use App\Models\AgentPayable;
use App\Models\User;

class AgentPayablePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('commission.view.global');
    }

    public function view(User $user, AgentPayable $payable): bool
    {
        return $user->can('commission.view.global');
    }

    public function pay(User $user, AgentPayable $payable): bool
    {
        return $user->can('commission.manage.global');
    }
}

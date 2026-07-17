<?php

namespace App\Policies;

use App\Models\UniversityAgreement;
use App\Models\User;

/**
 * Commission terms are visible to catalog managers and to anyone who can
 * see commissions (Finance/Management); only catalog managers mutate them.
 */
class UniversityAgreementPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canAny(['universities.manage.global', 'commission.view.global']);
    }

    public function view(User $user, UniversityAgreement $agreement): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->can('universities.manage.global');
    }

    public function update(User $user, UniversityAgreement $agreement): bool
    {
        return $user->can('universities.manage.global');
    }

    public function delete(User $user, UniversityAgreement $agreement): bool
    {
        return $user->can('universities.manage.global');
    }
}

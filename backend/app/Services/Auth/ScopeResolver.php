<?php

namespace App\Services\Auth;

use App\Models\User;

/**
 * Resolves the widest record scope a user holds for module.action.*
 * permissions (Technical Report §8.1). Order: global > branch >
 * department > assigned > own. Super Admin always resolves to global,
 * mirroring Gate::before.
 */
class ScopeResolver
{
    public const ORDER = ['global', 'branch', 'department', 'assigned', 'own'];

    public function resolve(User $user, string $module, string $action): ?string
    {
        if ($user->hasRole('Super Admin')) {
            return 'global';
        }

        foreach (self::ORDER as $scope) {
            if ($user->can("{$module}.{$action}.{$scope}")) {
                return $scope;
            }
        }

        return null;
    }
}

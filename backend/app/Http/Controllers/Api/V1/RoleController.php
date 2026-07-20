<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Staff roles for the user-management role picker + the read-only
 * role→permission matrix. Route-guarded by permission:users.manage.global.
 */
class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::where('guard_name', 'staff')
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json(['data' => $roles]);
    }

    /**
     * The full role→permission grid. Super Admin is excluded — it bypasses
     * every gate (Gate::before), so listing explicit grants would misrepresent
     * it; the UI notes its unrestricted access separately.
     */
    public function matrix(): JsonResponse
    {
        $permissions = Permission::where('guard_name', 'staff')
            ->orderBy('name')
            ->pluck('name')
            ->values();

        $roles = Role::where('guard_name', 'staff')
            ->where('name', '!=', 'Super Admin')
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name')->values(),
            ]);

        return response()->json(['data' => [
            'permissions' => $permissions,
            'roles' => $roles,
        ]]);
    }
}

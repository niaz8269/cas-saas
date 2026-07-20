<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;

/**
 * Assignable staff roles for the user-management role picker.
 * Route-guarded by permission:users.manage.global.
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
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Minimal staff directory (id + name) for assignee/officer/counselor pickers,
 * optionally filtered by role. Read-only, available to any authenticated staff —
 * colleague names, no sensitive fields.
 */
class StaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $staff = User::query()
            ->when($request->filled('role'), fn ($q) => $q->whereHas(
                'roles',
                fn ($r) => $r->where('name', $request->string('role')),
            ))
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json(['data' => $staff]);
    }
}

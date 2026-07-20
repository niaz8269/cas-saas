<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\JsonResponse;

/**
 * Active departments (id + name + code) for org-structure pickers.
 * Read-only reference data, available to any authenticated staff.
 */
class DepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        $departments = Department::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json(['data' => $departments]);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;

/**
 * Active branches (id + name + code) for org-structure pickers.
 * Read-only reference data, available to any authenticated staff.
 */
class BranchController extends Controller
{
    public function index(): JsonResponse
    {
        $branches = Branch::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json(['data' => $branches]);
    }
}

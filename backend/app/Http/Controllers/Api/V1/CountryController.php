<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Country;
use Illuminate\Http\JsonResponse;

/**
 * Reference list of countries for staff forms (nationality pickers). Read-only,
 * no special permission — reference data available to any authenticated staff.
 */
class CountryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Country::query()
                ->orderBy('name')
                ->get(['id', 'name', 'iso2']),
        ]);
    }
}

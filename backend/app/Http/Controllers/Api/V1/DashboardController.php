<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Analytics\AnalyticsService;
use App\Services\Auth\ScopeResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Role-scoped executive dashboard (report §5.10). Requires a dashboard
 * view grant; the returned aggregates are already narrowed to the user's
 * record scope by AnalyticsService.
 */
class DashboardController extends Controller
{
    public function __construct(
        private readonly AnalyticsService $analytics,
        private readonly ScopeResolver $scopes,
    ) {}

    public function executive(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_if(
            $this->scopes->resolve($user, 'dashboard', 'view') === null,
            403,
            'You do not have access to the dashboard.',
        );

        return response()->json(['data' => $this->analytics->executive($user)]);
    }

    public function performance(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_if(
            $this->scopes->resolve($user, 'reports', 'view') === null,
            403,
            'You do not have access to reports.',
        );

        return response()->json(['data' => $this->analytics->performance($user)]);
    }
}

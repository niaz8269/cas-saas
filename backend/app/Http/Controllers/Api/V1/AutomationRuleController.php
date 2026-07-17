<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AutomationRule;
use Illuminate\Http\JsonResponse;

/**
 * Read-only view of the configured automations for the settings screen.
 * Editing is an admin concern deferred to the settings module; this feeds
 * the "what's running" list.
 */
class AutomationRuleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => AutomationRule::orderBy('name')->get([
                'id', 'name', 'trigger_def', 'conditions', 'actions', 'is_active',
            ]),
        ]);
    }
}

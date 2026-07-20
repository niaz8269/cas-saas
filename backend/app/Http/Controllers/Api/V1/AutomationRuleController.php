<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AutomationRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Automations for the settings screen. The trigger/condition/action shapes are
 * code-defined; the settings surface only lets admins enable or disable a rule
 * (the AutomationEngine runs is_active rules only).
 */
class AutomationRuleController extends Controller
{
    private const FIELDS = ['id', 'name', 'trigger_def', 'conditions', 'actions', 'is_active'];

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => AutomationRule::orderBy('name')->get(self::FIELDS),
        ]);
    }

    public function update(Request $request, AutomationRule $automationRule): JsonResponse
    {
        $validated = $request->validate(['is_active' => ['required', 'boolean']]);

        $automationRule->update($validated);

        return response()->json(['data' => $automationRule->only(self::FIELDS)]);
    }
}

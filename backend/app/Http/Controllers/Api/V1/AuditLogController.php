<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\AuditLog;
use App\Models\Commission;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Models\VisaCase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only audit trail for administrators. Filterable by entity so an
 * admin can review the history of a specific record.
 */
class AuditLogController extends Controller
{
    /** Short model name → FQCN, so callers don't pass namespaced classes. */
    private const ENTITIES = [
        'user' => User::class,
        'student' => Student::class,
        'application' => Application::class,
        'invoice' => Invoice::class,
        'payment' => Payment::class,
        'commission' => Commission::class,
        'visa_case' => VisaCase::class,
    ];

    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::query()
            ->with('user:id,name')
            ->when($request->filled('filter.entity'), function ($q) use ($request) {
                $type = self::ENTITIES[$request->input('filter.entity')] ?? $request->input('filter.entity');
                $q->where('auditable_type', $type);
            })
            ->when($request->filled('filter.entity_id'), fn ($q) => $q->where('auditable_id', $request->input('filter.entity_id')))
            ->when($request->filled('filter.action'), fn ($q) => $q->where('action', $request->input('filter.action')))
            ->latest('id')
            ->paginate(min($request->integer('per_page', 30), 100));

        return response()->json([
            'data' => $logs->getCollection()->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'entity_type' => class_basename($log->auditable_type),
                'entity_id' => $log->auditable_id,
                'actor' => $log->user?->name,
                'old_values' => $log->old_values,
                'new_values' => $log->new_values,
                'ip' => $log->ip,
                'created_at' => $log->created_at?->toIso8601String(),
            ])->all(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'from' => $logs->firstItem(),
                'to' => $logs->lastItem(),
            ],
        ]);
    }
}

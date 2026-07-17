<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\TransitionCommissionRequest;
use App\Http\Resources\CommissionResource;
use App\Models\Commission;
use App\Services\Finance\CommissionEngine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CommissionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Commission::class);

        $base = Commission::query()->visibleTo($request->user());

        $commissions = (clone $base)
            ->with([
                'application:id,application_code,status,student_id',
                'application.student:id,first_name,last_name,student_code',
                'university:id,name,code',
                'agreement:id,commission_type,commission_value',
            ])
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.university_id'), fn ($q) => $q->where('university_id', $request->input('filter.university_id')))
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        // Pipeline totals: count + expected sum per lifecycle status.
        $pipeline = (clone $base)
            ->selectRaw('status, COUNT(*) as count, SUM(expected_amount) as expected_total')
            ->groupBy('status')
            ->get()
            ->keyBy('status')
            ->map(fn ($row) => ['count' => (int) $row->count, 'expected_total' => (float) $row->expected_total]);

        return CommissionResource::collection($commissions)->additional([
            'pipeline' => $pipeline,
        ]);
    }

    public function show(Request $request, Commission $commission): CommissionResource
    {
        $this->authorize('view', $commission);

        return new CommissionResource($commission->load([
            'application:id,application_code,status,student_id',
            'application.student:id,first_name,last_name,student_code',
            'university:id,name,code',
            'agreement:id,commission_type,commission_value',
            'statusHistory.changedBy:id,name',
            'payables.agent:id,name,agent_code,type',
            'payables.payments',
        ]));
    }

    public function transition(
        TransitionCommissionRequest $request,
        Commission $commission,
        CommissionEngine $engine,
    ): CommissionResource {
        $this->authorize('transition', $commission);

        $engine->transition(
            $commission,
            $request->string('status'),
            $request->user(),
            array_filter($request->only(['amount', 'method', 'reference', 'note']), fn ($v) => $v !== null),
        );

        return new CommissionResource($commission->refresh()->load([
            'application:id,application_code,status,student_id',
            'application.student:id,first_name,last_name,student_code',
            'university:id,name,code',
            'statusHistory.changedBy:id,name',
            'payables.agent:id,name,agent_code,type',
        ]));
    }
}

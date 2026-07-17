<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\PayAgentPayableRequest;
use App\Http\Resources\AgentPayableResource;
use App\Models\AgentPayable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AgentPayableController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', AgentPayable::class);

        $payables = AgentPayable::query()
            ->with([
                'agent:id,name,agent_code,type',
                'commission:id,application_id',
                'commission.application:id,student_id',
                'commission.application.student:id,first_name,last_name',
            ])
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.agent_id'), fn ($q) => $q->where('agent_id', $request->input('filter.agent_id')))
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        return AgentPayableResource::collection($payables);
    }

    /**
     * Record a payout (reference + optional document arrive as evidence);
     * the payable flips to paid once payouts cover the amount.
     */
    public function pay(PayAgentPayableRequest $request, AgentPayable $payable): AgentPayableResource
    {
        $this->authorize('pay', $payable);

        $amount = (float) ($request->input('amount') ?? $payable->amount);

        $payable->payments()->create([
            'amount' => $amount,
            'method' => $request->input('method', 'bank_transfer'),
            'reference' => $request->string('reference'),
            'paid_at' => now(),
            'recorded_by' => $request->user()->id,
        ]);

        $totalPaid = (float) $payable->payments()->sum('amount');

        if ($totalPaid >= (float) $payable->amount) {
            $payable->update(['status' => 'paid']);
        }

        return new AgentPayableResource($payable->refresh()->load(['agent:id,name,agent_code,type', 'payments']));
    }
}

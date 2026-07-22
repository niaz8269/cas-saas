<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgentRequestResource;
use App\Models\Agent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Admin management of agent/partner accounts — chiefly the approval queue for
 * self-registered partner requests (status pending → active or rejected).
 * Gated by agents.view.global (list) / agents.manage.global (approve/reject).
 */
class AgentController extends Controller
{
    /** List agent/partner accounts, newest first; filter by status + search. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $agents = Agent::query()
            ->with('country:id,name')
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->where('name', 'like', $term)
                    ->orWhere('contact_name', 'like', $term)
                    ->orWhere('email', 'like', $term));
            })
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        return AgentRequestResource::collection($agents);
    }

    /** Approve a pending partner request — the agent can now sign in. */
    public function approve(Agent $agent): AgentRequestResource
    {
        abort_unless($agent->status === 'pending', 409, 'Only a pending request can be approved.');

        $agent->update(['status' => 'active']);

        return new AgentRequestResource($agent->load('country'));
    }

    /** Reject a pending partner request. */
    public function reject(Agent $agent): AgentRequestResource
    {
        abort_unless($agent->status === 'pending', 409, 'Only a pending request can be rejected.');

        $agent->update(['status' => 'rejected']);

        return new AgentRequestResource($agent->load('country'));
    }
}

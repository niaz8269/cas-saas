<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\AssignLeadRequest;
use App\Http\Requests\Crm\ConvertLeadRequest;
use App\Http\Requests\Crm\UpdateLeadRequest;
use App\Http\Resources\LeadResource;
use App\Http\Resources\StudentResource;
use App\Models\Lead;
use App\Models\Task;
use App\Services\Leads\ConvertLead;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LeadController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Lead::class);

        $leads = Lead::query()
            ->visibleTo($request->user())
            ->with(['country:id,name,iso2', 'websiteSource:id,domain', 'campaign:id,name', 'assignee:id,name'])
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.assigned_user_id'), fn ($q) => $q->where('assigned_user_id', $request->input('filter.assigned_user_id')))
            ->when($request->filled('filter.website_source_id'), fn ($q) => $q->where('website_source_id', $request->input('filter.website_source_id')))
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->where('first_name', 'like', $term)
                    ->orWhere('last_name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('phone', 'like', $term));
            })
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        return LeadResource::collection($leads);
    }

    public function show(Request $request, Lead $lead): LeadResource
    {
        $this->authorize('view', $lead);

        return new LeadResource(
            $lead->load(['country:id,name,iso2', 'websiteSource:id,domain', 'campaign:id,name', 'assignee:id,name']),
        );
    }

    public function update(UpdateLeadRequest $request, Lead $lead): LeadResource
    {
        $this->authorize('update', $lead);

        $lead->update($request->validated());

        return new LeadResource($lead->load('assignee:id,name'));
    }

    /**
     * Assign to a counselor; auto-creates the SLA follow-up task (§5.2).
     */
    public function assign(AssignLeadRequest $request, Lead $lead): LeadResource
    {
        $this->authorize('assign', $lead);

        $lead->update([
            'assigned_user_id' => $request->integer('assigned_user_id'),
            'status' => $lead->status === 'new' ? 'assigned' : $lead->status,
        ]);

        Task::create([
            'title' => 'Follow up lead: '.($lead->full_name ?: $lead->email ?: "#{$lead->id}"),
            'assignee_id' => $lead->assigned_user_id,
            'related_type' => Lead::class,
            'related_id' => $lead->id,
            'due_at' => now()->addHours(48),
            'priority' => 'normal',
            'status' => 'open',
            'created_by' => $request->user()->id,
        ]);

        return new LeadResource($lead->load('assignee:id,name'));
    }

    /**
     * Convert to a permanent student identity.
     */
    public function convert(ConvertLeadRequest $request, Lead $lead, ConvertLead $converter): StudentResource
    {
        $this->authorize('convert', $lead);

        $student = $converter->handle($lead, $request->user(), $request->validated());

        return new StudentResource($student->load(['country:id,name,iso2', 'branch:id,name,code', 'counselor:id,name']));
    }
}

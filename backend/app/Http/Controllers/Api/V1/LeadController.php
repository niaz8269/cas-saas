<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\AssignLeadRequest;
use App\Http\Requests\Crm\ConvertLeadRequest;
use App\Http\Requests\Crm\StoreLeadRequest;
use App\Http\Requests\Crm\StoreNoteRequest;
use App\Http\Requests\Crm\UpdateLeadRequest;
use App\Http\Resources\ActivityResource;
use App\Http\Resources\LeadResource;
use App\Http\Resources\StudentResource;
use App\Models\Activity;
use App\Models\Lead;
use App\Models\MarketingSource;
use App\Models\Task;
use App\Services\Leads\ConvertLead;
use App\Support\CsvExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Lead::class);

        $leads = $this->filteredLeads($request)
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        return LeadResource::collection($leads);
    }

    /** Export the filtered, RBAC-scoped leads as CSV. */
    public function export(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', Lead::class);

        return CsvExport::stream(
            'leads-'.now()->format('Ymd-His').'.csv',
            $this->filteredLeads($request),
            ['Name', 'Email', 'Phone', 'Country', 'Status', 'Form type', 'Source', 'Campaign', 'Assignee', 'Created'],
            fn (Lead $l) => [
                $l->full_name,
                $l->email,
                $l->phone,
                $l->country?->name,
                $l->status,
                $l->form_type,
                $l->websiteSource?->domain,
                $l->campaign?->name,
                $l->assignee?->name,
                $l->created_at?->toDateString(),
            ],
        );
    }

    /** The filtered + RBAC-scoped leads query shared by index and export. */
    private function filteredLeads(Request $request): Builder
    {
        return Lead::query()
            ->visibleTo($request->user())
            ->with(['country:id,name,iso2', 'websiteSource:id,domain', 'campaign:id,name', 'assignee:id,name'])
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.assigned_user_id'), fn ($q) => $q->where('assigned_user_id', $request->input('filter.assigned_user_id')))
            ->when($request->filled('filter.website_source_id'), fn ($q) => $q->where('website_source_id', $request->input('filter.website_source_id')))
            ->when($request->filled('filter.form_type'), fn ($q) => $q->where('form_type', $request->input('filter.form_type')))
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->where('first_name', 'like', $term)
                    ->orWhere('last_name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('phone', 'like', $term));
            });
    }

    /** Marketing sources for the "add lead" source picker. */
    public function sources(): JsonResponse
    {
        return response()->json([
            'data' => MarketingSource::orderBy('name')->get(['id', 'name', 'channel']),
        ]);
    }

    /** Staff-added lead (admin / counselor / marketing — report §5.1). */
    public function store(StoreLeadRequest $request): LeadResource
    {
        $this->authorize('create', Lead::class);

        $data = $request->validated();
        $assignedTo = $data['assigned_user_id'] ?? null;

        $lead = Lead::create([
            ...$data,
            'intake_route' => $data['intake_route'] ?? 'info',
            'status' => $assignedTo ? 'assigned' : 'new',
        ]);

        // Assigning at creation opens the same 48h SLA follow-up as assign().
        if ($assignedTo) {
            Task::create([
                'title' => 'Follow up lead: '.($lead->full_name ?: $lead->email ?: "#{$lead->id}"),
                'assignee_id' => $assignedTo,
                'related_type' => Lead::class,
                'related_id' => $lead->id,
                'due_at' => now()->addHours(48),
                'priority' => 'normal',
                'status' => 'open',
                'created_by' => $request->user()->id,
            ]);
        }

        return new LeadResource(
            $lead->load(['country:id,name,iso2', 'marketingSource:id,name', 'assignee:id,name']),
        );
    }

    public function show(Request $request, Lead $lead): LeadResource
    {
        $this->authorize('view', $lead);

        return new LeadResource(
            $lead->load(['country:id,name,iso2', 'marketingSource:id,name', 'websiteSource:id,domain', 'campaign:id,name', 'assignee:id,name']),
        );
    }

    public function update(UpdateLeadRequest $request, Lead $lead): LeadResource
    {
        $this->authorize('update', $lead);

        $before = $lead->status;
        $lead->update($request->validated());

        // Record status changes on the lead timeline.
        if ($lead->status !== $before) {
            Activity::create([
                'lead_id' => $lead->id,
                'user_id' => $request->user()->id,
                'type' => 'status',
                'body' => "Status changed from {$before} to {$lead->status}",
                'created_at' => now(),
            ]);
        }

        return new LeadResource($lead->load('assignee:id,name'));
    }

    /** Soft-delete a lead (Admin/Ops only; recoverable, audit-logged). */
    public function destroy(Lead $lead): JsonResponse
    {
        $this->authorize('delete', $lead);

        $lead->delete();

        return response()->json(['message' => 'Lead deleted.']);
    }

    /** Activity timeline for the lead, newest first. */
    public function timeline(Request $request, Lead $lead): AnonymousResourceCollection
    {
        $this->authorize('view', $lead);

        $activities = $lead->activities()
            ->with('user:id,name')
            ->latest('id')
            ->paginate(min($request->integer('per_page', 25), 100));

        return ActivityResource::collection($activities);
    }

    /** Append a note to the lead timeline. */
    public function addNote(StoreNoteRequest $request, Lead $lead): ActivityResource
    {
        $this->authorize('update', $lead);

        $activity = Activity::create([
            'lead_id' => $lead->id,
            'user_id' => $request->user()->id,
            'type' => $request->input('type', 'note'),
            'body' => $request->string('body'),
            'created_at' => now(),
        ]);

        return new ActivityResource($activity->load('user:id,name'));
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

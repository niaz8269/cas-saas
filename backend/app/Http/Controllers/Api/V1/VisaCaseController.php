<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Visa\AssignVisaOfficerRequest;
use App\Http\Requests\Visa\TransitionVisaCaseRequest;
use App\Http\Requests\Visa\UpdateVisaChecklistItemRequest;
use App\Http\Resources\VisaCaseResource;
use App\Http\Resources\VisaChecklistItemResource;
use App\Models\VisaCase;
use App\Models\VisaChecklistItem;
use App\Services\Visa\VisaWorkflow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class VisaCaseController extends Controller
{
    private const LIST_RELATIONS = [
        'student:id,student_code,first_name,last_name',
        'application:id,application_code,status,university_id',
        'application.university:id,name',
        'officer:id,name',
    ];

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', VisaCase::class);

        $cases = VisaCase::query()
            ->visibleTo($request->user())
            ->with(self::LIST_RELATIONS)
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.student_id'), fn ($q) => $q->where('student_id', $request->input('filter.student_id')))
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->whereHas('student', fn ($sq) => $sq
                        ->where('first_name', 'like', $term)
                        ->orWhere('last_name', 'like', $term)
                        ->orWhere('student_code', 'like', $term))
                    ->orWhereHas('application', fn ($aq) => $aq
                        ->where('application_code', 'like', $term)));
            })
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        // Pipeline totals for the board header: count per lifecycle status.
        $pipeline = VisaCase::query()
            ->visibleTo($request->user())
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($total) => (int) $total);

        return VisaCaseResource::collection($cases)
            ->additional(['pipeline' => $pipeline]);
    }

    public function show(Request $request, VisaCase $visaCase): VisaCaseResource
    {
        $this->authorize('view', $visaCase);

        $visaCase->load([
            ...self::LIST_RELATIONS,
            'checklistItems',
            'statusHistory.changedBy:id,name',
        ]);

        return new VisaCaseResource($visaCase);
    }

    public function transition(
        TransitionVisaCaseRequest $request,
        VisaCase $visaCase,
        VisaWorkflow $workflow,
    ): VisaCaseResource {
        $this->authorize('update', $visaCase);

        $workflow->transition(
            $visaCase,
            $request->string('status'),
            $request->user(),
            $request->input('note'),
            ['appointment_at' => $request->input('appointment_at')],
        );

        return new VisaCaseResource(
            $visaCase->load([...self::LIST_RELATIONS, 'checklistItems', 'statusHistory.changedBy:id,name']),
        );
    }

    public function assign(AssignVisaOfficerRequest $request, VisaCase $visaCase): VisaCaseResource
    {
        $this->authorize('update', $visaCase);

        $visaCase->update(['assigned_visa_officer_id' => $request->integer('user_id')]);

        return new VisaCaseResource($visaCase->load(self::LIST_RELATIONS));
    }

    public function updateChecklistItem(
        UpdateVisaChecklistItemRequest $request,
        VisaCase $visaCase,
        VisaChecklistItem $item,
    ): VisaChecklistItemResource {
        $this->authorize('update', $visaCase);

        abort_unless($item->visa_case_id === $visaCase->id, 404);

        $item->update($request->validated());

        return new VisaChecklistItemResource($item);
    }
}

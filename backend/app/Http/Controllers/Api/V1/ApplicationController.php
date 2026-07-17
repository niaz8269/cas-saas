<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admissions\StoreApplicationRequest;
use App\Http\Requests\Admissions\StoreOfferRequest;
use App\Http\Requests\Admissions\TransitionApplicationRequest;
use App\Http\Requests\Admissions\UpdateApplicationRequest;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\OfferResource;
use App\Models\Application;
use App\Services\Admissions\ApplicationWorkflow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ApplicationController extends Controller
{
    private const LIST_RELATIONS = [
        'student:id,student_code,first_name,last_name',
        'university:id,name,code',
        'course:id,name,level',
        'admissionsOfficer:id,name',
    ];

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Application::class);

        $applications = Application::query()
            ->visibleTo($request->user())
            ->with(self::LIST_RELATIONS)
            ->withCount('documents')
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.university_id'), fn ($q) => $q->where('university_id', $request->input('filter.university_id')))
            ->when($request->filled('filter.student_id'), fn ($q) => $q->where('student_id', $request->input('filter.student_id')))
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->where('application_code', 'like', $term)
                    ->orWhereHas('student', fn ($sq) => $sq
                        ->where('first_name', 'like', $term)
                        ->orWhere('last_name', 'like', $term)
                        ->orWhere('student_code', 'like', $term)));
            })
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        return ApplicationResource::collection($applications);
    }

    public function store(StoreApplicationRequest $request, ApplicationWorkflow $workflow): ApplicationResource
    {
        $this->authorize('create', Application::class);

        $application = $workflow->create($request->validated(), $request->user());

        return new ApplicationResource($application->load(self::LIST_RELATIONS));
    }

    public function show(Request $request, Application $application, ApplicationWorkflow $workflow): ApplicationResource
    {
        $this->authorize('view', $application);

        $application->load([
            ...self::LIST_RELATIONS,
            'intake:id,name',
            'scholarship:id,name',
            'offers',
            'statusHistory.changedBy:id,name',
        ])->loadCount('documents');

        return (new ApplicationResource($application))->additional([
            'checklist' => [
                'missing' => $workflow->missingChecklist($application)->values(),
            ],
        ]);
    }

    public function update(UpdateApplicationRequest $request, Application $application): ApplicationResource
    {
        $this->authorize('update', $application);

        $application->update([...$request->validated(), 'updated_by' => $request->user()->id]);

        return new ApplicationResource($application->load(self::LIST_RELATIONS));
    }

    public function transition(
        TransitionApplicationRequest $request,
        Application $application,
        ApplicationWorkflow $workflow,
    ): ApplicationResource {
        $this->authorize('update', $application);

        $workflow->transition(
            $application,
            $request->string('status'),
            $request->user(),
            $request->input('note'),
        );

        return new ApplicationResource(
            $application->load([...self::LIST_RELATIONS, 'statusHistory.changedBy:id,name']),
        );
    }

    public function storeOffer(
        StoreOfferRequest $request,
        Application $application,
        ApplicationWorkflow $workflow,
    ): OfferResource {
        $this->authorize('update', $application);

        $offer = $application->offers()->create($request->validated());

        // Recording an offer on a submitted application advances the flow.
        if ($application->status === 'submitted') {
            $workflow->transition($application, 'offer_received', $request->user(), 'Offer recorded');
        }

        return new OfferResource($offer);
    }
}

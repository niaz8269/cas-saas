<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admissions\RespondToOfferRequest;
use App\Http\Requests\Admissions\StoreApplicationRequest;
use App\Http\Requests\Admissions\StoreOfferRequest;
use App\Http\Requests\Admissions\TransitionApplicationRequest;
use App\Http\Requests\Admissions\UpdateApplicationRequest;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\OfferResource;
use App\Models\Application;
use App\Models\Offer;
use App\Services\Admissions\ApplicationWorkflow;
use App\Support\BrandAssets;
use App\Support\CsvExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class ApplicationController extends Controller
{
    private const LIST_RELATIONS = [
        'student:id,student_code,first_name,last_name',
        'university:id,name,code',
        'program:id,name,level',
        'scholarship:id,name',
        'source:id,name',
        'admissionsOfficer:id,name',
    ];

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Application::class);

        $applications = $this->filteredApplications($request)
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        return ApplicationResource::collection($applications);
    }

    /** Export the filtered, RBAC-scoped applications as CSV. */
    public function export(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', Application::class);

        return CsvExport::stream(
            'applications-'.now()->format('Ymd-His').'.csv',
            $this->filteredApplications($request),
            ['Code', 'Student', 'Student code', 'University', 'Program', 'Kind', 'Scholarship',
                'Status', 'To verify', 'Source', 'Officer', 'Documents', 'Submitted', 'Created'],
            fn (Application $a) => [
                $a->application_code,
                $a->student?->full_name,
                $a->student?->student_code,
                $a->university?->name,
                $a->program?->name,
                $a->kind,
                $a->scholarship?->name,
                $a->status,
                $a->review ? 'yes' : 'no',
                $a->source?->name,
                $a->admissionsOfficer?->name,
                $a->documents_count,
                $a->submitted_at?->toDateString(),
                $a->created_at?->toDateString(),
            ],
        );
    }

    /**
     * The filtered + RBAC-scoped applications query shared by index and export
     * (no ordering/pagination applied).
     */
    private function filteredApplications(Request $request): Builder
    {
        return Application::query()
            ->visibleTo($request->user())
            ->with(self::LIST_RELATIONS)
            ->withCount('documents')
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.university_id'), fn ($q) => $q->where('university_id', $request->input('filter.university_id')))
            ->when($request->filled('filter.student_id'), fn ($q) => $q->where('student_id', $request->input('filter.student_id')))
            ->when($request->filled('filter.review'), fn ($q) => $q->where('review', $request->boolean('filter.review')))
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->where('application_code', 'like', $term)
                    ->orWhereHas('student', fn ($sq) => $sq
                        ->where('first_name', 'like', $term)
                        ->orWhere('last_name', 'like', $term)
                        ->orWhere('student_code', 'like', $term)));
            });
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
            'university:id,name,code',
            'program:id,name,level',
            'scholarship:id,name',
            'source:id,name',
            'admissionsOfficer:id,name',
            'intake:id,name',
            'offers',
            'statusHistory.changedBy:id,name',
            // Full applicant profile for the detail view (list uses trimmed columns).
            'student.country:id,name',
            'student.guardians',
            'student.education',
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

    /**
     * Record the applicant's response to an offer. Accepting an offer that the
     * application is still awaiting advances it through the full acceptance
     * workflow (money trail + visa case); declining just marks the offer.
     */
    public function respondToOffer(
        RespondToOfferRequest $request,
        Application $application,
        Offer $offer,
        ApplicationWorkflow $workflow,
    ): OfferResource {
        $this->authorize('update', $application);

        abort_unless($offer->application_id === $application->id, 404);

        if ($offer->status !== 'issued') {
            throw new ConflictHttpException("Offer already {$offer->status}.");
        }

        $decision = (string) $request->input('decision');

        DB::transaction(function () use ($application, $offer, $decision, $request, $workflow) {
            $offer->update(['status' => $decision]);

            if ($decision === 'accepted' && $application->status === 'offer_received') {
                $workflow->transition(
                    $application,
                    'accepted',
                    $request->user(),
                    $request->input('note') ?: 'Offer accepted',
                );
            }
        });

        return new OfferResource($offer->refresh());
    }

    /** Render a branded offer letter as a PDF, streamed inline. */
    public function offerLetter(Application $application, Offer $offer): Response
    {
        $this->authorize('view', $application);

        abort_unless($offer->application_id === $application->id, 404);

        $application->loadMissing([
            'student:id,student_code,first_name,last_name,passport_no',
            'university:id,name,code',
            'program:id,name,level',
            'intake:id,name',
        ]);

        $pdf = Pdf::loadView('pdf.offer', [
            'application' => $application,
            'offer' => $offer,
            'student' => $application->student,
            'university' => $application->university,
            'program' => $application->program,
            'logo' => BrandAssets::logoDataUri(),
            'issuedOn' => ($offer->issued_date ?? now())->format('d M Y'),
            'expiresOn' => $offer->expiry_date?->format('d M Y') ?? '—',
        ]);

        $filename = 'offer-'.($offer->reference_no ?: $application->application_code).'.pdf';

        return $pdf->stream($filename);
    }
}

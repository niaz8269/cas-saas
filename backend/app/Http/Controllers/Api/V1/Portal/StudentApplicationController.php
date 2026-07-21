<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Api\V1\Portal\Concerns\HandlesPortalApplications;
use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\StudentStoreApplicationRequest;
use App\Http\Requests\Portal\StudentStoreScholarshipApplicationRequest;
use App\Models\Application;
use App\Models\Major;
use App\Models\Scholarship;
use App\Services\Admissions\ApplicationCatalog;
use App\Services\Admissions\PortalApplicationService;
use App\Services\Documents\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The student self-apply wizard (report §5.11). The shared browse + document +
 * submit flow lives in {@see HandlesPortalApplications}; this controller adds
 * the student-scoped create-draft, the government-scholarship variant, and the
 * student ownership guard. Identity comes from the student token.
 */
class StudentApplicationController extends Controller
{
    use HandlesPortalApplications;

    public function __construct(
        private readonly ApplicationCatalog $catalog,
        private readonly PortalApplicationService $applications,
        private readonly DocumentService $documents,
    ) {}

    /** The student sees the student service-charge tier. */
    protected function applicantRate(): string
    {
        return 'student';
    }

    /** Study fields for the government-scholarship preference picker. */
    public function majors(): JsonResponse
    {
        return response()->json([
            'data' => Major::active()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /** Active government scholarships (with their universities + benefits). */
    public function governmentScholarships(): JsonResponse
    {
        $scholarships = Scholarship::query()
            ->where('scope', 'government')
            ->where('status', 'active')
            ->with('universities:id,name,city')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $scholarships->map(fn (Scholarship $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'type' => $s->type,
                'coverage' => $s->coverage,
                'currency' => $s->currency,
                'description' => $s->description,
                'eligibility' => $s->eligibility,
                'benefits' => $s->benefits,
                'universities' => $s->universities->map(fn ($u) => [
                    'id' => $u->id, 'name' => $u->name, 'city' => $u->city,
                ])->values(),
            ])->values(),
        ]);
    }

    /** Create a draft general government-scholarship application. */
    public function storeScholarshipApplication(StudentStoreScholarshipApplicationRequest $request): JsonResponse
    {
        $application = $this->applications->createScholarshipDraft($request->user(), $request->validated());
        $application->loadMissing('scholarship');

        return response()->json([
            'data' => [
                'id' => $application->id,
                'application_code' => $application->application_code,
                'status' => $application->status,
                'required_documents' => $this->documentPayload(
                    $this->catalog->requiredDocuments(null, $application->scholarship),
                ),
            ],
        ], 201);
    }

    /** Create a draft application for the authenticated student. */
    public function store(StudentStoreApplicationRequest $request): JsonResponse
    {
        $application = $this->applications->createDraft($request->user(), $request->validated());
        $application->loadMissing('program', 'scholarship');

        return response()->json([
            'data' => [
                'id' => $application->id,
                'application_code' => $application->application_code,
                'status' => $application->status,
                'required_documents' => $this->documentPayload(
                    $this->catalog->requiredDocuments($application->program, $application->scholarship),
                ),
            ],
        ], 201);
    }

    /** The application must belong to the student and still be a draft. */
    protected function authorizeDraft(Request $request, Application $application): void
    {
        abort_unless($application->student_id === $request->user()->id, 404);
        abort_unless($application->status === 'draft', 409, 'This application can no longer be edited.');
    }
}

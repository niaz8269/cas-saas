<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Api\V1\Portal\Concerns\HandlesPortalApplications;
use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\StudentStoreApplicationRequest;
use App\Http\Requests\Portal\StudentStoreScholarshipApplicationRequest;
use App\Models\Application;
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

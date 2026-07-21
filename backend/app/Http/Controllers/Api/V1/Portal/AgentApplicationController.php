<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Api\V1\Portal\Concerns\HandlesPortalApplications;
use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\AgentStoreApplicationRequest;
use App\Http\Requests\Portal\AgentStoreScholarshipApplicationRequest;
use App\Models\Application;
use App\Models\Student;
use App\Services\Admissions\ApplicationCatalog;
use App\Services\Admissions\PortalApplicationService;
use App\Services\Documents\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The agent "apply on behalf of a student" wizard (report §5.7). Reuses the
 * shared apply flow ({@see HandlesPortalApplications}); the agent picks one of
 * their OWN students, sees the AGENT service-charge tier, and the draft is
 * attributed to the agent (agent_id), so Finance later bills the agent tier
 * automatically ({@see \App\Services\Finance\FeeScheduleService}).
 */
class AgentApplicationController extends Controller
{
    use HandlesPortalApplications;

    public function __construct(
        private readonly ApplicationCatalog $catalog,
        private readonly PortalApplicationService $applications,
        private readonly DocumentService $documents,
    ) {}

    /** The agent sees the agent service-charge tier. */
    protected function applicantRate(): string
    {
        return 'agent';
    }

    /** Create a draft application for one of the agent's own students. */
    public function store(AgentStoreApplicationRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // The request already validated the student belongs to this agent;
        // createDraft attributes the draft to the agent (agent_id is derived
        // from student->agent_id).
        $student = Student::findOrFail($validated['student_id']);

        $application = $this->applications->createDraft($student, $validated);
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

    /** Create a draft government-scholarship application for an owned student. */
    public function storeScholarshipApplication(AgentStoreScholarshipApplicationRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // The request already validated the student belongs to this agent.
        $student = Student::findOrFail($validated['student_id']);

        $application = $this->applications->createScholarshipDraft($student, $validated);
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

    /** The draft must be one the acting agent created (attributed to them). */
    protected function authorizeDraft(Request $request, Application $application): void
    {
        abort_unless($application->agent_id === $request->user()->id, 404);
        abort_unless($application->status === 'draft', 409, 'This application can no longer be edited.');
    }
}

<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Api\V1\Portal\Concerns\HandlesPortalApplications;
use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\AgentStoreApplicationRequest;
use App\Http\Requests\Portal\AgentStoreScholarshipApplicationRequest;
use App\Models\Application;
use App\Models\Student;
use App\Services\Admissions\ApplicationCatalog;
use App\Services\Admissions\ApplicationWorkflow;
use App\Services\Admissions\PortalApplicationService;
use App\Services\Documents\DocumentService;
use App\Services\Finance\FeeScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The agent "apply on behalf of a student" wizard (report §5.7). Reuses the
 * shared apply flow ({@see HandlesPortalApplications}); the agent picks one of
 * their OWN students, sees the AGENT service-charge tier, and the draft is
 * attributed to the agent (agent_id), so Finance later bills the agent tier
 * automatically ({@see FeeScheduleService}).
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

        $application = $this->applications->createDraft($student, $validated, 'agent');
        $application->loadMissing('program', 'scholarship');

        return response()->json([
            'data' => [
                'id' => $application->id,
                'application_code' => $application->application_code,
                'status' => $application->status,
                'required_documents' => $this->documentPayload(
                    $this->catalog->requiredDocuments($application->program, $application->scholarship),
                ),
                'optional_documents' => $this->documentPayload(
                    $this->catalog->optionalDocuments($application->program, $application->scholarship),
                ),
                'resumed' => ! $application->wasRecentlyCreated,
            ],
        ], $application->wasRecentlyCreated ? 201 : 200);
    }

    /** Create a draft government-scholarship application for an owned student. */
    public function storeScholarshipApplication(AgentStoreScholarshipApplicationRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // The request already validated the student belongs to this agent.
        $student = Student::findOrFail($validated['student_id']);

        $application = $this->applications->createScholarshipDraft($student, $validated, 'agent');
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

    /**
     * The application must be the acting agent's: one they created, or one for a student of theirs that has no agent
     * of its own (the same attribution the commission engine uses). It stays open until it is accepted.
     */
    protected function authorizeDraft(Request $request, Application $application): void
    {
        $agentId = $request->user()->id;

        // Asked of the database rather than loaded onto the application, so the student relation is not left
        // half-loaded (just an id) for the code that goes on to read the student's name.
        abort_unless(
            $application->agent_id === $agentId
                || ($application->agent_id === null && Student::whereKey($application->student_id)->where('agent_id', $agentId)->exists()),
            404,
        );
        abort_unless(in_array($application->status, ApplicationWorkflow::APPLICANT_EDITABLE, true), 409, 'This application can no longer be edited.');
    }
}

<?php

namespace App\Http\Controllers\Api\V1\Portal\Concerns;

use App\Http\Resources\Portal\ApplicantProgramResource;
use App\Http\Resources\Portal\StudentDocumentResource;
use App\Models\Agent;
use App\Models\Application;
use App\Models\Country;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Major;
use App\Models\Program;
use App\Models\Scholarship;
use App\Services\Admissions\ApplicantDetailsUpdater;
use App\Services\Admissions\ApplicationCatalog;
use App\Services\Admissions\ApplicationWorkflow;
use App\Services\Comms\NotificationService;
use App\Services\Documents\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

/**
 * The shared apply-wizard flow for both portal applicants — student self-apply
 * and agent on-behalf (report §5.11 / §5.7). Browsing (degree/funding →
 * programs, program → document checklist) and the write path (attach JPG
 * documents to a draft, submit it) are identical; the using controller only
 * supplies the applicant-specific bits: which service-charge tier to display
 * (applicantRate) and the per-draft ownership check (authorizeDraft). The
 * create-draft itself (store) stays per-controller because the applicant is
 * resolved differently (student = token; agent = a chosen owned student).
 *
 * Requires the using controller to expose: ApplicationCatalog $catalog,
 * PortalApplicationService $applications, DocumentService $documents.
 */
trait HandlesPortalApplications
{
    /** 'student' | 'agent' — selects the service-charge tier shown in step 1. */
    abstract protected function applicantRate(): string;

    /** Guard: the draft must belong to the acting applicant and still be editable. */
    abstract protected function authorizeDraft(Request $request, Application $application): void;

    /** Step 1: programs matching the degree tile + funding option. */
    public function availability(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'degree' => ['required', Rule::in(ApplicationCatalog::DEGREES)],
            'funding' => ['required', Rule::in(ApplicationCatalog::FUNDING)],
            'q' => ['nullable', 'string', 'max:100'],
            'university' => ['nullable', 'string', 'max:200'],
            'university_id' => ['nullable', 'integer'],
            'city' => ['nullable', 'string', 'max:120'],
            'language' => ['nullable', 'string', 'max:60'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        // The list is paged and searched in the database: the catalog holds far too many programs to send at once.
        [$programs, $suggestion] = $this->catalog->availabilityPage(
            $validated['degree'],
            $validated['funding'],
            $this->applicantRate(),
            $validated,
            (int) ($validated['page'] ?? 1),
            (int) ($validated['per_page'] ?? 25),
        );

        $response = ApplicantProgramResource::collection($programs)->additional(['suggestion' => $suggestion]);
        // The filter boxes are described once, with the first page.
        if ((int) ($validated['page'] ?? 1) === 1) {
            $response->additional(['suggestion' => $suggestion, 'facets' => $this->catalog->availabilityFacets($validated['degree'], $validated['funding'], $validated['university'] ?? null)]);
        }

        return $response->response();
    }

    /** Which funding options a degree can offer (self always; scholarship/
     * partial only when a matching award exists). */
    public function fundingOptions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'degree' => ['required', Rule::in(ApplicationCatalog::DEGREES)],
        ]);

        return response()->json(['data' => $this->catalog->fundingOptions($validated['degree'])]);
    }

    /** Countries for the nationality picker. */
    public function countries(): JsonResponse
    {
        return response()->json([
            'data' => Country::orderBy('name')->get(['id', 'name', 'iso2']),
        ]);
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

    /** The resolved required-document checklist for a program (+ scholarship). */
    public function requiredDocuments(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'program_id' => ['required', 'integer', 'exists:programs,id'],
            'scholarship_id' => ['nullable', 'integer', 'exists:scholarships,id'],
        ]);

        $program = Program::findOrFail($validated['program_id']);
        $scholarship = ! empty($validated['scholarship_id'])
            ? Scholarship::find($validated['scholarship_id'])
            : null;

        return response()->json(['data' => $this->documentPayload(
            $this->catalog->requiredDocuments($program, $scholarship),
        )]);
    }

    /** Pre-signed PUT URL for a JPG document on the draft. */
    public function presignDocument(Request $request, Application $application): JsonResponse
    {
        $this->authorizeDraft($request, $application);

        $validated = $this->validateUpload($request, withKey: false);

        return response()->json($this->documents->presignUpload(
            $application,
            $validated['file_name'],
            $validated['mime'],
        ));
    }

    /** Register the uploaded JPG against the draft application. */
    public function storeDocument(Request $request, Application $application): StudentDocumentResource
    {
        $this->authorizeDraft($request, $application);

        $validated = $this->validateUpload($request, withKey: true);

        abort_unless(
            str_starts_with($validated['key'], $this->documents->keyPrefix($application)),
            422,
            'Storage key does not belong to this application.',
        );

        $document = $this->documents->register(
            $application,
            DocumentType::findOrFail($validated['document_type_id']),
            $validated['key'],
            $validated['file_name'],
            $validated['mime'],
            $validated['size'],
            null, // portal upload — no staff actor
            $request->ip(),
        );

        // After the application has left the draft, the officer handling it hears about each new file.
        if ($application->status !== 'draft' && $application->assigned_admissions_id !== null) {
            app(NotificationService::class)->push(
                $application->assigned_admissions_id,
                'document.uploaded',
                'New document uploaded',
                "{$application->application_code}: the applicant added {$document->type?->name}.",
                entityType: 'application',
                entityId: $application->id,
            );
        }

        return new StudentDocumentResource($document->load('type:id,name,category'));
    }

    /**
     * Everything the wizard needs to carry on with a saved draft: the chosen program, funding, intake and answers,
     * and the document checklist. The applicant's personal details live on their record, not here.
     */
    public function draftDetail(Request $request, Application $application): JsonResponse
    {
        $this->authorizeDraft($request, $application);
        abort_unless($application->program_id !== null, 404);

        $application->loadMissing('program.university.country', 'program.intakes', 'scholarship:id,name,coverage,type', 'student');
        $program = $application->program;
        $program->setAttribute(
            'applicant_service_charge',
            $this->catalog->serviceChargeFor($program, $this->applicantRate(), $application->scholarship_id),
        );

        $name = strtoupper($program->name);
        $degree = match (true) {
            str_contains($name, 'MBBS') => 'mbbs',
            str_contains($name, 'BDS') || str_contains($name, 'STOMATOLOG') => 'bds',
            $program->level === 'master' => 'master',
            in_array($program->level, ['phd', 'doctor', 'doctoral'], true) => 'phd',
            $program->level === 'diploma' => 'diploma',
            default => 'bs',
        };
        $funding = $application->scholarship_id === null
            ? 'self'
            : (str_contains(strtolower(($application->scholarship->coverage ?? '').' '.($application->scholarship->type ?? '')), 'partial') ? 'partial' : 'scholarship');

        return response()->json(['data' => [
            'id' => $application->id,
            'application_code' => $application->application_code,
            'status' => $application->status,
            'student_id' => $application->student_id,
            'student' => ['id' => $application->student_id, 'full_name' => $application->student?->full_name],
            'degree' => $degree,
            'funding' => $funding,
            'scholarship_id' => $application->scholarship_id,
            'intake_id' => $application->intake_id,
            'custom_fields' => $application->custom_fields ?? (object) [],
            'program' => (new ApplicantProgramResource($program))->toArray($request),
            'required_documents' => $this->documentPayload($this->catalog->requiredDocuments($program, $application->scholarship)),
            'optional_documents' => $this->documentPayload($this->catalog->optionalDocuments($program, $application->scholarship)),
        ]]);
    }

    /** Every file uploaded so far on the draft (a document type can hold several). */
    public function documentsOnDraft(Request $request, Application $application): JsonResponse
    {
        $this->authorizeDraft($request, $application);

        $documents = $application->documents()->with('type:id,name,category')->orderBy('id')->get();

        return response()->json(['data' => $documents->map(fn (Document $d) => [
            ...(new StudentDocumentResource($d))->toArray($request),
            'document_type_id' => $d->document_type_id,
        ])->values()]);
    }

    /** A short-lived link to look at one uploaded file (the access is logged). */
    public function viewDocument(Request $request, Application $application, Document $document): JsonResponse
    {
        $this->authorizeDraft($request, $application);
        $this->abortUnlessOnDraft($application, $document);

        return response()->json([
            ...$this->documents->downloadUrl($document, null, $request->ip(), 'view'),
            'file_name' => $document->file_name,
            'mime' => $document->mime,
        ]);
    }

    /** Take a wrongly uploaded file off the draft. */
    public function removeDocument(Request $request, Application $application, Document $document): JsonResponse
    {
        $this->authorizeDraft($request, $application);
        $this->abortUnlessOnDraft($application, $document);

        $document->delete();

        return response()->json(['message' => 'Document removed.']);
    }

    private function abortUnlessOnDraft(Application $application, Document $document): void
    {
        abort_unless(
            $document->documentable_type === Application::class && $document->documentable_id === $application->id,
            404,
        );
    }

    /**
     * Delete an application that is still a draft. It is a soft delete (recoverable by an administrator, and audit-logged).
     * An application that is already with CAS is withdrawn instead, so the record of it stays.
     */
    public function destroy(Request $request, Application $application): JsonResponse
    {
        $this->authorizeDraft($request, $application);
        abort_unless($application->status === 'draft', 409, 'Only a draft can be deleted. Withdraw an application that is already with CAS.');

        $application->delete();

        return response()->json(['message' => 'Application deleted.']);
    }

    /**
     * Ask CAS to change something the applicant cannot change alone, such as the program or the funding. It goes to the
     * officer handling the application (or the administrators) and is recorded on the student's timeline.
     */
    public function requestChange(Request $request, Application $application, ApplicantDetailsUpdater $updater): JsonResponse
    {
        $this->authorizeDraft($request, $application);

        $validated = $request->validate(['message' => ['required', 'string', 'min:5', 'max:1000']]);
        $by = $request->user() instanceof Agent ? "partner {$request->user()->name}" : 'the student';

        $updater->requestChange($application, trim($validated['message']), $by);

        return response()->json(['message' => 'Your request has been sent to CAS.'], 201);
    }

    /** Withdraw an application that is with CAS, any time before it is accepted. It stays on record as withdrawn. */
    public function withdraw(Request $request, Application $application, ApplicationWorkflow $workflow): JsonResponse
    {
        $this->authorizeDraft($request, $application);
        abort_if($application->status === 'draft', 409, 'Delete a draft instead of withdrawing it.');

        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);
        $by = $request->user() instanceof Agent ? 'the partner' : 'the student';
        $note = trim("Withdrawn by {$by}. ".($validated['reason'] ?? ''));

        $withdrawn = $workflow->transition($application, 'withdrawn', null, $note);

        if ($withdrawn->assigned_admissions_id !== null) {
            app(NotificationService::class)->push(
                $withdrawn->assigned_admissions_id,
                'application.withdrawn',
                'Application withdrawn',
                "{$withdrawn->application_code} was withdrawn by {$by}.",
                entityType: 'application',
                entityId: $withdrawn->id,
            );
        }

        return response()->json(['data' => [
            'id' => $withdrawn->id,
            'application_code' => $withdrawn->application_code,
            'status' => $withdrawn->status,
        ]]);
    }

    /** Submit the completed draft to CAS (draft → under_review). */
    public function submit(Request $request, Application $application): JsonResponse
    {
        $this->authorizeDraft($request, $application);

        $submitted = $this->applications->submit($application);

        return response()->json(['data' => [
            'id' => $submitted->id,
            'application_code' => $submitted->application_code,
            'status' => $submitted->status,
        ]]);
    }

    /**
     * Shared upload validation: JPG images and PDF scans for the wizard.
     *
     * @return array<string, mixed>
     */
    protected function validateUpload(Request $request, bool $withKey): array
    {
        return $request->validate([
            'document_type_id' => ['required', 'integer', Rule::exists('document_types', 'id')],
            'file_name' => ['required', 'string', 'max:255', 'ends_with:.jpg,.jpeg,.pdf,.JPG,.JPEG,.PDF'],
            'mime' => ['required', Rule::in(['image/jpeg', 'application/pdf'])],
            'size' => ['required', 'integer', 'min:1', 'max:'.DocumentService::MAX_BYTES],
            'key' => [Rule::requiredIf($withKey), 'string', 'max:500'],
        ], [
            'mime.in' => 'Only JPG images and PDF files are accepted.',
            'file_name.ends_with' => 'Only JPG images and PDF files are accepted.',
        ]);
    }

    /**
     * @param  Collection<int, DocumentType>  $documents
     * @return array<int, array<string, mixed>>
     */
    protected function documentPayload($documents): array
    {
        return $documents->map(fn (DocumentType $type) => [
            'id' => $type->id,
            'name' => $type->name,
            'category' => $type->category,
            'is_sensitive' => $type->is_sensitive,
            'instruction' => $type->instruction,
        ])->values()->all();
    }
}

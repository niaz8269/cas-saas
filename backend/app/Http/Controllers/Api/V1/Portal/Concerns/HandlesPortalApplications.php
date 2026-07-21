<?php

namespace App\Http\Controllers\Api\V1\Portal\Concerns;

use App\Http\Resources\Portal\ApplicantProgramResource;
use App\Http\Resources\Portal\StudentDocumentResource;
use App\Models\Application;
use App\Models\Country;
use App\Models\DocumentType;
use App\Models\Program;
use App\Models\Scholarship;
use App\Services\Admissions\ApplicationCatalog;
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
        ]);

        $programs = $this->catalog->availability(
            $validated['degree'],
            $validated['funding'],
            $this->applicantRate(),
        );

        return ApplicantProgramResource::collection($programs)->response();
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

        return new StudentDocumentResource($document->load('type:id,name,category'));
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
     * Shared upload validation — JPG only for the wizard (report step 4).
     *
     * @return array<string, mixed>
     */
    protected function validateUpload(Request $request, bool $withKey): array
    {
        return $request->validate([
            'document_type_id' => ['required', 'integer', Rule::exists('document_types', 'id')],
            'file_name' => ['required', 'string', 'max:255', 'ends_with:.jpg,.jpeg,.JPG,.JPEG'],
            'mime' => ['required', Rule::in(['image/jpeg'])],
            'size' => ['required', 'integer', 'min:1', 'max:'.DocumentService::MAX_BYTES],
            'key' => [Rule::requiredIf($withKey), 'string', 'max:500'],
        ], [
            'mime.in' => 'Only JPG images are accepted.',
            'file_name.ends_with' => 'Only JPG images are accepted.',
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
        ])->values()->all();
    }
}

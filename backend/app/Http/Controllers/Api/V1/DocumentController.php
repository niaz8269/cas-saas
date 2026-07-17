<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\PresignDocumentRequest;
use App\Http\Requests\Documents\StoreDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\Application;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Student;
use App\Services\Documents\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DocumentController extends Controller
{
    public function __construct(private readonly DocumentService $documents) {}

    /**
     * Step 1 of upload: short-lived pre-signed PUT URL for direct-to-S3.
     */
    public function presign(PresignDocumentRequest $request): JsonResponse
    {
        $documentable = $this->resolveDocumentable($request);

        $this->authorize('create', Document::class);
        $this->authorize('view', $documentable); // must at least see the parent

        return response()->json($this->documents->presignUpload(
            $documentable,
            $request->string('file_name'),
            $request->string('mime'),
        ));
    }

    /**
     * Step 2 of upload: register the uploaded object as a document.
     */
    public function store(StoreDocumentRequest $request): DocumentResource
    {
        $documentable = $this->resolveDocumentable($request);

        $this->authorize('create', Document::class);
        $this->authorize('view', $documentable);

        // The key must live under this documentable's prefix — prevents
        // registering (and later serving) another record's object.
        abort_unless(
            str_starts_with($request->string('key'), $this->documents->keyPrefix($documentable)),
            422,
            'Storage key does not belong to this record.',
        );

        $document = $this->documents->register(
            $documentable,
            DocumentType::findOrFail($request->integer('document_type_id')),
            $request->string('key'),
            $request->string('file_name'),
            $request->string('mime'),
            $request->integer('size'),
            $request->user(),
            $request->ip(),
        );

        return new DocumentResource($document->load('type'));
    }

    /**
     * Policy-checked pre-signed GET; every call is access-logged.
     */
    public function download(Request $request, Document $document): JsonResponse
    {
        $document->load('type');
        $this->authorize('view', $document);

        return response()->json(
            $this->documents->downloadUrl($document, $request->user(), $request->ip()),
        );
    }

    public function verify(Request $request, Document $document): DocumentResource
    {
        $this->authorize('verify', $document);

        $document->update(['status' => 'verified', 'verified_by' => $request->user()->id]);
        $this->documents->log($document, $request->user(), 'view', $request->ip());

        return new DocumentResource($document->load(['type', 'verifier']));
    }

    public function reject(Request $request, Document $document): DocumentResource
    {
        $this->authorize('verify', $document);

        $document->update(['status' => 'rejected', 'verified_by' => $request->user()->id]);

        return new DocumentResource($document->load(['type', 'verifier']));
    }

    /**
     * Documents attached to an application (checklist section).
     */
    public function forApplication(Request $request, Application $application): AnonymousResourceCollection
    {
        $this->authorize('view', $application);

        return DocumentResource::collection(
            $application->documents()->with(['type', 'verifier'])->orderByDesc('id')->get(),
        );
    }

    private function resolveDocumentable(Request $request): Application|Student
    {
        $class = DocumentService::DOCUMENTABLES[$request->string('documentable_type')->toString()];

        return $class::findOrFail($request->integer('documentable_id'));
    }
}

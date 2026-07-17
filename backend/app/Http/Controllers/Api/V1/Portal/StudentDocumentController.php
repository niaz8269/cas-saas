<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\StudentPresignRequest;
use App\Http\Requests\Portal\StudentStoreDocumentRequest;
use App\Http\Resources\Portal\StudentDocumentResource;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Student;
use App\Services\Documents\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The student portal's one write path (report §5.11: "upload allowed").
 * Documents always attach to the authenticated student — there is no
 * documentable selection, so a student can only ever upload to their own
 * record. Uploads land as `pending` for staff verification; portal
 * uploads carry no staff actor.
 */
class StudentDocumentController extends Controller
{
    public function __construct(private readonly DocumentService $documents) {}

    /**
     * Step 1: short-lived pre-signed PUT URL, scoped to the student's key
     * prefix.
     */
    public function presign(StudentPresignRequest $request): JsonResponse
    {
        return response()->json($this->documents->presignUpload(
            $request->user(),
            $request->string('file_name'),
            $request->string('mime'),
        ));
    }

    /**
     * Step 2: register the uploaded object against the student. The key
     * must live under the student's prefix — a portal upload can never
     * register another record's object.
     */
    public function store(StudentStoreDocumentRequest $request): StudentDocumentResource
    {
        $student = $request->user();

        abort_unless(
            str_starts_with($request->string('key'), $this->documents->keyPrefix($student)),
            422,
            'Storage key does not belong to this record.',
        );

        $document = $this->documents->register(
            $student,
            DocumentType::findOrFail($request->integer('document_type_id')),
            $request->string('key'),
            $request->string('file_name'),
            $request->string('mime'),
            $request->integer('size'),
            null, // portal upload — no staff actor
            $request->ip(),
        );

        return new StudentDocumentResource($document->load('type:id,name,category'));
    }

    /**
     * Brokered pre-signed download of one of the student's own documents
     * (report §5.11: "downloadable letters"). Ownership is enforced by the
     * documentable link; every access is logged.
     */
    public function download(Request $request, Document $document): JsonResponse
    {
        $student = $request->user();

        abort_unless(
            $document->documentable_type === Student::class
                && $document->documentable_id === $student->id,
            404,
        );

        return response()->json(
            $this->documents->downloadUrl($document, null, $request->ip()),
        );
    }
}

<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Resources\Portal\StudentApplicationResource;
use App\Http\Resources\Portal\StudentDocumentResource;
use App\Http\Resources\Portal\StudentInvoiceResource;
use App\Http\Resources\Portal\StudentVisaCaseResource;
use App\Models\DocumentType;
use App\Models\Invoice;
use App\Models\VisaCase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Student portal reads (report §5.11): own records only, financial and
 * commission internals hidden. The authenticated student (student guard)
 * is the entire scope. Uploads live in StudentDocumentController.
 */
class StudentPortalController extends Controller
{
    public function applications(Request $request): AnonymousResourceCollection
    {
        $applications = $request->user()->applications()
            ->with([
                'university:id,name',
                'course:id,name,level',
                'intake:id,name',
                'offers',
                'statusHistory',
            ])
            ->latest()
            ->get();

        return StudentApplicationResource::collection($applications);
    }

    /**
     * The student's visa case (at most one).
     */
    public function visaCase(Request $request): StudentVisaCaseResource
    {
        $case = VisaCase::query()
            ->where('student_id', $request->user()->id)
            ->with(['checklistItems', 'application:id,application_code'])
            ->latest('id')
            ->first();

        abort_if($case === null, 404, 'No visa case yet.');

        return new StudentVisaCaseResource($case);
    }

    public function invoices(Request $request): AnonymousResourceCollection
    {
        $invoices = Invoice::query()
            ->where('party_type', 'student')
            ->where('party_id', $request->user()->id)
            ->with(['items', 'payments'])
            ->latest('id')
            ->get();

        return StudentInvoiceResource::collection($invoices);
    }

    public function documents(Request $request): AnonymousResourceCollection
    {
        $documents = $request->user()->documents()
            ->with('type:id,name,category')
            ->orderByDesc('id')
            ->get();

        return StudentDocumentResource::collection($documents);
    }

    /**
     * Document types the student may upload against (names/categories are
     * not sensitive; the sensitive flag governs staff visibility, not this
     * picklist).
     */
    public function documentTypes(): JsonResponse
    {
        return response()->json([
            'data' => DocumentType::orderBy('name')->get(['id', 'name', 'category']),
        ]);
    }
}

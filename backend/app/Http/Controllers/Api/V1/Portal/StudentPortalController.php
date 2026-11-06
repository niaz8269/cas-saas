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
use App\Services\Finance\InvoicePdfRenderer;
use App\Services\Finance\ProcessingFee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

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
                'program:id,name,level',
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
            // Drafts are CAS's working proposals (service charges are negotiated
            // with the student first): the student only sees what staff issued.
            ->where('status', '!=', 'draft')
            ->with(['items', 'payments', 'bankAccount'])
            ->latest('id')
            ->get();

        return StudentInvoiceResource::collection($invoices);
    }

    /** Stream the branded PDF for one of the student's own invoices. */
    public function invoicePdf(Request $request, Invoice $invoice, InvoicePdfRenderer $renderer): Response
    {
        abort_unless(
            $invoice->party_type === 'student'
                && $invoice->party_id === $request->user()->id
                && $invoice->status !== 'draft',
            404,
        );

        return $renderer->stream($invoice, $request->user()->full_name);
    }

    /** The fee voucher: the same sheet, framed as what CAS confirmed and how to pay. */
    public function invoiceVoucher(Request $request, Invoice $invoice, InvoicePdfRenderer $renderer, ProcessingFee $fee): Response
    {
        abort_unless(
            $invoice->party_type === 'student'
                && $invoice->party_id === $request->user()->id
                && $invoice->status !== 'draft',
            404,
        );

        return $renderer->stream($invoice, $request->user()->full_name, voucher: true, paymentInstructions: $fee->instructions());
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

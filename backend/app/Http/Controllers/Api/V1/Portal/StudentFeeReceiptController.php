<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\StudentStoreReceiptRequest;
use App\Models\DocumentType;
use App\Models\Invoice;
use App\Models\Student;
use App\Services\Comms\NotificationService;
use App\Services\Documents\DocumentService;
use App\Services\Finance\ProcessingFee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The student uploads proof of paying their processing fee. The receipt lands
 * against the INVOICE (not the student) so Finance can see, from the invoice
 * they are about to settle, exactly what was banked — and so a later payment
 * row can point at it via payments.document_id.
 *
 * Uploading does not submit the application: it puts the receipt in front of
 * Finance, who confirm the payment and thereby release the application.
 */
class StudentFeeReceiptController extends Controller
{
    /** Document type receipts are filed under; created on first use. */
    private const TYPE_NAME = 'Payment receipt';

    public function __construct(
        private readonly DocumentService $documents,
        private readonly ProcessingFee $fee,
        private readonly NotificationService $notifications,
    ) {}

    /** The student's outstanding processing-fee invoice, if any. */
    public function show(Request $request): JsonResponse
    {
        $student = $request->user();
        $invoice = $this->fee->invoiceFor($student);
        $amount = $this->fee->amount();

        return response()->json([
            'data' => [
                'fee' => $amount,
                'settled' => $invoice?->status === 'paid',
                'invoice' => $invoice === null ? null : [
                    'id' => $invoice->id,
                    'invoice_no' => $invoice->invoice_no,
                    'total' => (float) $invoice->total,
                    'amount_paid' => (float) $invoice->amount_paid,
                    'currency' => $invoice->currency,
                    'status' => $invoice->status,
                    'receipts' => $invoice->documents()
                        ->orderByDesc('id')
                        ->get(['id', 'file_name', 'status', 'created_at'])
                        ->map(fn ($d) => [
                            'id' => $d->id,
                            'file_name' => $d->file_name,
                            'status' => $d->status,
                            'uploaded_at' => $d->created_at?->toIso8601String(),
                        ]),
                ],
            ],
        ]);
    }

    /**
     * Register an uploaded receipt against the student's own fee invoice.
     * The object key must sit under the student's own storage prefix, so a
     * portal upload can never claim another record's file.
     */
    public function store(StudentStoreReceiptRequest $request, Invoice $invoice): JsonResponse
    {
        $student = $request->user();

        abort_unless(
            $invoice->party_type === 'student' && $invoice->party_id === $student->id,
            404,
        );

        abort_if($invoice->status === 'paid', 409, 'This invoice is already settled.');
        abort_if($invoice->status === 'cancelled', 409, 'This invoice was cancelled.');

        abort_unless(
            str_starts_with($request->string('key'), $this->documents->keyPrefix($student)),
            422,
            'Storage key does not belong to this record.',
        );

        $document = $this->documents->register(
            $invoice,
            $this->receiptType(),
            $request->string('key'),
            $request->string('file_name'),
            $request->string('mime'),
            $request->integer('size'),
            null, // portal upload — no staff actor
            $request->ip(),
        );

        $this->notifyFinance($student, $invoice);

        return response()->json([
            'data' => [
                'id' => $document->id,
                'file_name' => $document->file_name,
                'status' => $document->status,
                'uploaded_at' => $document->created_at?->toIso8601String(),
            ],
            'message' => 'Receipt received. Your application will be submitted once CAS confirms the payment.',
        ], 201);
    }

    private function receiptType(): DocumentType
    {
        return DocumentType::firstOrCreate(
            ['name' => self::TYPE_NAME],
            ['category' => 'financial', 'is_sensitive' => true],
        );
    }

    private function notifyFinance(Student $student, Invoice $invoice): void
    {
        $this->notifications->pushToRoles(
            ['Finance', 'Super Admin'],
            'payment.receipt_uploaded',
            'Processing fee receipt to confirm',
            "{$student->full_name} uploaded a receipt for {$invoice->invoice_no}. Confirming it submits their application.",
            entityType: 'invoice',
            entityId: $invoice->id,
        );
    }
}

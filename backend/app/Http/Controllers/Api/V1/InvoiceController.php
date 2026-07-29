<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreInvoicePaymentRequest;
use App\Http\Requests\Finance\StoreInvoiceRefundRequest;
use App\Http\Requests\Finance\StoreInvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Agent;
use App\Models\Application;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\University;
use App\Services\Admissions\PortalApplicationService;
use App\Services\Comms\NotificationService;
use App\Services\Finance\FeeScheduleService;
use App\Services\Finance\InvoicePdfRenderer;
use App\Services\Finance\InvoiceService;
use App\Services\Finance\ProcessingFee;
use App\Support\CsvExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvoiceController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Invoice::class);

        $invoices = $this->filteredInvoices($request)
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        $this->attachPartyNames($invoices->getCollection());

        return InvoiceResource::collection($invoices);
    }

    /** Export the filtered invoices as CSV. */
    public function export(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', Invoice::class);

        return CsvExport::stream(
            'invoices-'.now()->format('Ymd-His').'.csv',
            $this->filteredInvoices($request),
            ['Invoice no', 'Party type', 'Application', 'Student', 'Currency', 'Subtotal', 'Total', 'Paid', 'Status', 'Issued', 'Due', 'Created'],
            fn (Invoice $i) => [
                $i->invoice_no,
                $i->party_type,
                $i->application?->application_code,
                $i->application?->student?->full_name,
                $i->currency,
                $i->subtotal,
                $i->total,
                $i->amount_paid,
                $i->status,
                $i->issued_at?->toDateString(),
                $i->due_at?->toDateString(),
                $i->created_at?->toDateString(),
            ],
        );
    }

    private function filteredInvoices(Request $request): Builder
    {
        return Invoice::query()
            ->with('application:id,application_code,student_id', 'application.student:id,first_name,last_name')
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.party_type'), fn ($q) => $q->where('party_type', $request->input('filter.party_type')))
            ->when($request->filled('filter.application_id'), fn ($q) => $q->where('application_id', $request->input('filter.application_id')))
            ->when($request->filled('q'), fn ($q) => $q->where('invoice_no', 'like', '%'.$request->string('q').'%'));
    }

    /**
     * Suggested invoice lines for an application, pulled from the course's fee
     * structure (tuition/hostel/service charge) for the officer to review.
     */
    public function feeSchedule(Request $request, FeeScheduleService $fees): JsonResponse
    {
        $this->authorize('manage', Invoice::class);

        $request->validate([
            'application_id' => ['required', 'integer', Rule::exists('applications', 'id')],
        ]);

        $application = Application::findOrFail($request->integer('application_id'));

        return response()->json(['data' => $fees->for($application)]);
    }

    public function store(StoreInvoiceRequest $request, InvoiceService $service): InvoiceResource
    {
        $this->authorize('manage', Invoice::class);

        $data = $request->validated();

        $invoice = $service->create(
            partyType: $data['party_type'],
            partyId: $data['party_id'],
            applicationId: $data['application_id'] ?? null,
            currency: strtoupper($data['currency']),
            items: $data['items'],
            actor: $request->user(),
            status: $data['status'] ?? 'issued',
            dueDays: $data['due_days'] ?? 30,
        );

        $invoice->load(['items', 'application:id,application_code,student_id', 'application.student:id,first_name,last_name']);
        $this->attachPartyNames(collect([$invoice]));

        return new InvoiceResource($invoice);
    }

    public function show(Request $request, Invoice $invoice): InvoiceResource
    {
        $this->authorize('view', $invoice);

        $invoice->load([
            'items',
            'payments.recorder:id,name',
            'application:id,application_code,student_id',
            'application.student:id,first_name,last_name',
        ]);

        $this->attachPartyNames(collect([$invoice]));

        return new InvoiceResource($invoice);
    }

    public function storePayment(
        StoreInvoicePaymentRequest $request,
        Invoice $invoice,
        InvoiceService $service,
        PortalApplicationService $portalApplications,
    ): InvoiceResource {
        $this->authorize('manage', $invoice);

        $service->recordPayment(
            $invoice,
            (float) $request->input('amount'),
            $request->user(),
            $request->input('method'),
            $request->input('reference'),
            $request->integer('document_id') ?: null,
        );

        $this->releaseFeeBlockedApplications($invoice->refresh(), $portalApplications);

        return new InvoiceResource($invoice->refresh()->load(['items', 'payments.recorder:id,name']));
    }

    /**
     * Confirming a processing-fee payment is what submits the student's funded
     * application — they uploaded their receipt and have been waiting on us.
     * Anything else (tuition, hostel) is untouched by this.
     */
    private function releaseFeeBlockedApplications(Invoice $invoice, PortalApplicationService $portalApplications): void
    {
        if ($invoice->status !== 'paid' || $invoice->party_type !== 'student') {
            return;
        }

        $isProcessingFee = $invoice->items()
            ->where('fee_type', ProcessingFee::FEE_TYPE)
            ->exists();

        if (! $isProcessingFee) {
            return;
        }

        $student = Student::find($invoice->party_id);

        if ($student === null) {
            return;
        }

        foreach ($portalApplications->releaseSettled($student) as $application) {
            $this->notifications->pushToStudent(
                $student->id,
                'application.submitted',
                'Application submitted',
                "Your payment was confirmed and {$application->application_code} has been submitted to CAS Admissions.",
                entityType: 'application',
                entityId: $application->id,
            );
        }
    }

    /**
     * Void an invoice that was raised in error. Blocked once any payment has
     * been recorded — a settled invoice is corrected with a refund/credit note,
     * never voided.
     */
    public function void(Request $request, Invoice $invoice, InvoiceService $service): InvoiceResource
    {
        $this->authorize('manage', $invoice);

        if ($invoice->status === 'cancelled') {
            throw ValidationException::withMessages(['status' => 'This invoice is already cancelled.']);
        }

        if ((float) $invoice->amount_paid > 0) {
            throw ValidationException::withMessages([
                'status' => 'Cannot void an invoice with payments recorded. Issue a refund or credit note first.',
            ]);
        }

        $service->void($invoice);

        return new InvoiceResource($invoice->refresh()->load(['items', 'payments.recorder:id,name']));
    }

    /**
     * Record a refund against a settled invoice as an append-only negative
     * receipt. The original payments are never altered.
     */
    public function refund(StoreInvoiceRefundRequest $request, Invoice $invoice, InvoiceService $service): InvoiceResource
    {
        $this->authorize('manage', $invoice);

        if ($invoice->status === 'cancelled') {
            throw ValidationException::withMessages(['amount' => 'Cannot refund a cancelled invoice.']);
        }

        $service->recordRefund(
            $invoice,
            (float) $request->input('amount'),
            $request->user(),
            (string) $request->input('reference'),
        );

        return new InvoiceResource($invoice->refresh()->load(['items', 'payments.recorder:id,name']));
    }

    /** Render a branded invoice as a PDF, streamed inline. */
    public function pdf(Request $request, Invoice $invoice, InvoicePdfRenderer $renderer): Response
    {
        $this->authorize('view', $invoice);

        $this->attachPartyNames(collect([$invoice]));

        return $renderer->stream($invoice, (string) ($invoice->getAttribute('party_name') ?? ''));
    }

    /**
     * Resolve party names in one query per party type (no N+1).
     *
     * @param  Collection<int, Invoice>  $invoices
     */
    private function attachPartyNames(Collection $invoices): void
    {
        $names = [
            'student' => Student::whereIn('id', $invoices->where('party_type', 'student')->pluck('party_id'))
                ->get(['id', 'first_name', 'last_name'])
                ->mapWithKeys(fn ($s) => [$s->id => $s->full_name]),
            'agent' => Agent::whereIn('id', $invoices->where('party_type', 'agent')->pluck('party_id'))
                ->pluck('name', 'id'),
            'university' => University::whereIn('id', $invoices->where('party_type', 'university')->pluck('party_id'))
                ->pluck('name', 'id'),
        ];

        foreach ($invoices as $invoice) {
            $invoice->setAttribute('party_name', $names[$invoice->party_type][$invoice->party_id] ?? null);
        }
    }
}

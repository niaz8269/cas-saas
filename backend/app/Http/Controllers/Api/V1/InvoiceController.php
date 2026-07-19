<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreInvoicePaymentRequest;
use App\Http\Requests\Finance\StoreInvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Agent;
use App\Models\Application;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\University;
use App\Services\Finance\FeeScheduleService;
use App\Services\Finance\InvoicePdfRenderer;
use App\Services\Finance\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class InvoiceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Invoice::class);

        $invoices = Invoice::query()
            ->with('application:id,application_code,student_id', 'application.student:id,first_name,last_name')
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.party_type'), fn ($q) => $q->where('party_type', $request->input('filter.party_type')))
            ->when($request->filled('filter.application_id'), fn ($q) => $q->where('application_id', $request->input('filter.application_id')))
            ->when($request->filled('q'), fn ($q) => $q->where('invoice_no', 'like', '%'.$request->string('q').'%'))
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        $this->attachPartyNames($invoices->getCollection());

        return InvoiceResource::collection($invoices);
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
    ): InvoiceResource {
        $this->authorize('manage', $invoice);

        $service->recordPayment(
            $invoice,
            (float) $request->input('amount'),
            $request->user(),
            $request->input('method'),
            $request->input('reference'),
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

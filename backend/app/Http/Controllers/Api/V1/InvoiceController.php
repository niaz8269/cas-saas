<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreInvoicePaymentRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Agent;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\University;
use App\Services\Finance\InvoicePdfRenderer;
use App\Services\Finance\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;
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

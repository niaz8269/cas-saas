<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\PublicEnquiryRequest;
use App\Models\ApiSource;
use App\Models\Lead;
use App\Services\Leads\LeadIngestionService;
use Illuminate\Http\JsonResponse;

/**
 * Public website enquiry form → a source-attributed lead (report §1.1:
 * "websites as lead sources"). Reuses the ingestion pipeline (dedup,
 * source attribution) but ALWAYS returns the same generic acknowledgement
 * — the public response must never reveal whether the email/phone already
 * matches an existing lead or student.
 */
class PublicEnquiryController extends Controller
{
    public function store(PublicEnquiryRequest $request, LeadIngestionService $service): JsonResponse
    {
        // Honeypot: bots fill hidden fields. Accept silently, create nothing.
        if ($request->filled('company')) {
            return $this->accepted();
        }

        $source = ApiSource::firstOrCreate(
            ['name' => 'CAS Website'],
            ['type' => 'website', 'website_url' => 'https://www.cas.moe', 'is_active' => true],
        );

        $result = $service->ingest($source, [
            'first_name' => $request->input('first_name'),
            'last_name' => $request->input('last_name'),
            'email' => $request->input('email'),
            'phone' => $request->input('phone'),
            'country' => $request->input('country'),
            'message' => $request->input('message'),
            'intake_route' => 'info',
        ]);

        // Attach the browsing context to the lead (internal only, never
        // returned) so a counselor sees what the visitor was looking at.
        $interest = array_filter([
            'university_id' => $request->integer('interested_university_id') ?: null,
            'program_id' => $request->integer('interested_program_id') ?: null,
            'source_url' => $request->input('source_url'),
        ], fn ($v) => $v !== null);

        if ($interest !== [] && ($leadId = $result['body']['lead_id'] ?? null) && ($lead = Lead::find($leadId))) {
            $lead->update(['meta' => [...($lead->meta ?? []), 'enquiry' => $interest]]);
        }

        return $this->accepted();
    }

    private function accepted(): JsonResponse
    {
        return response()->json(
            ['message' => 'Thank you — a CAS advisor will be in touch shortly.'],
            202,
        );
    }
}

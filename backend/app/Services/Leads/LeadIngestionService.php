<?php

namespace App\Services\Leads;

use App\Models\ApiSource;
use App\Models\Campaign;
use App\Models\Country;
use App\Models\Lead;
use App\Models\WebsiteSource;

/**
 * Turns a validated ingestion payload into a source-attributed lead,
 * applying duplicate detection per the report's contract:
 *
 *  - exact student match  → lead saved as `duplicate`, linked via student_id, 409
 *  - exact lead match     → lead saved as `duplicate`, linked via duplicate_of, 409
 *  - probable name match  → lead saved as `new` with a review flag in meta, 201
 *  - clean                → lead saved as `new`, 201
 *
 * Every inquiry is persisted — duplicates included — for the audit trail.
 */
class LeadIngestionService
{
    public function __construct(private readonly DuplicateDetector $detector) {}

    /**
     * @param  array<string, mixed>  $data
     * @return array{status: int, body: array<string, mixed>}
     */
    public function ingest(ApiSource $source, array $data): array
    {
        $email = $this->detector->normalizeEmail($data['email'] ?? null);
        $phone = $this->detector->normalizePhone($data['phone'] ?? null);
        $passport = $this->detector->normalizePassport($data['passport_no'] ?? null);

        $attributes = [
            'first_name' => $data['first_name'] ?? null,
            'last_name' => $data['last_name'] ?? null,
            'email' => $email,
            'phone' => $phone,
            'passport_no' => $passport,
            'country_id' => $this->resolveCountry($data['country'] ?? null),
            'website_source_id' => $this->resolveWebsiteSource($source, $data['website_domain'] ?? null),
            'campaign_id' => $this->resolveCampaign($data['campaign_utm'] ?? null),
            'intake_route' => $data['intake_route'] ?? 'info',
            'form_type' => $data['form_type'] ?? null,
            'message' => $data['message'] ?? null,
            'meta' => array_filter([
                'api_source_id' => $source->id,
                // The form's own extra answers, kept verbatim for the counselor.
                'form' => ! empty($data['fields']) ? $data['fields'] : null,
            ], fn ($v) => $v !== null),
        ];

        // 1. Exact student match — the person already exists permanently.
        if ($student = $this->detector->findExactStudent($email, $phone, $passport)) {
            $lead = Lead::create([
                ...$attributes,
                'status' => 'duplicate',
                'student_id' => $student->id,
            ]);

            return [
                'status' => 409,
                'body' => [
                    'code' => 'DUPLICATE',
                    'message' => 'Matched existing student',
                    'student_id' => $student->id,
                    'lead_id' => $lead->id,
                ],
            ];
        }

        // 2. Exact open-lead match — same inquiry from another channel.
        if ($existingLead = $this->detector->findExactLead($email, $phone, $passport)) {
            $lead = Lead::create([
                ...$attributes,
                'status' => 'duplicate',
                'duplicate_of' => $existingLead->id,
            ]);

            return [
                'status' => 409,
                'body' => [
                    'code' => 'DUPLICATE',
                    'message' => 'Matched existing lead',
                    'duplicate_of' => $existingLead->id,
                    'lead_id' => $lead->id,
                ],
            ];
        }

        // 3. Probable match — flag for the Admin review queue, never auto-link.
        $probable = $this->detector->findProbableStudent(
            $data['first_name'] ?? null,
            $data['last_name'] ?? null,
            $data['dob'] ?? null,
        );

        if ($probable) {
            $attributes['meta'] = [
                ...$attributes['meta'],
                'dedup' => ['review' => true, 'probable_student_id' => $probable->id],
            ];
        }

        $lead = Lead::create([...$attributes, 'status' => 'new']);

        return [
            'status' => 201,
            'body' => [
                'lead_id' => $lead->id,
                'student_id' => null,
                'duplicate' => false,
                'review' => (bool) $probable,
            ],
        ];
    }

    private function resolveCountry(?string $iso2): ?int
    {
        return $iso2
            ? Country::where('iso2', strtoupper($iso2))->value('id')
            : null;
    }

    private function resolveWebsiteSource(ApiSource $source, ?string $domain): ?int
    {
        if ($domain) {
            $byDomain = WebsiteSource::where('domain', mb_strtolower(trim($domain)))->value('id');
            if ($byDomain) {
                return $byDomain;
            }
        }

        return WebsiteSource::where('api_source_id', $source->id)->value('id');
    }

    private function resolveCampaign(?string $utm): ?int
    {
        return $utm
            ? Campaign::where('utm_campaign', $utm)->value('id')
            : null;
    }
}

<?php

namespace App\Http\Resources\Public;

use App\Models\Program;
use App\Services\Admissions\ApplicationCatalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A program as the public website sees it. Fees (tuition + the CAS service
 * charge) are gated to registered users, and the service-charge rate follows
 * the viewer's role (student vs agent), resolved from the request audience.
 *
 * @mixin Program
 */
class PublicProgramResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $audience = $request->attributes->get('audience', 'public');
        $applicant = $audience === 'agent' ? 'agent' : 'student';
        // Per-record, admin-configurable audience visibility (ADR-0015) — each fee
        // field gated independently, with the registered-only default when unconfigured.
        $tuitionVisible = $this->resource->audienceCanSee('tuition_fee', $audience);
        $chargeVisible = $this->resource->audienceCanSee('service_charge', $audience);
        $applyVisible = $this->resource->audienceCanSee('apply_link', $audience);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'level' => $this->level,
            'teaching_language' => $this->teaching_language,
            'duration_months' => $this->duration_months,
            'currency' => $this->currency,
            'requirements' => $this->requirements,
            // Fee fields — each visible per the record's config; rate follows the role.
            // `fee_locked` drives the public "sign in to see fees" prompt.
            'fee_locked' => ! $tuitionVisible,
            'tuition_fee' => $tuitionVisible ? $this->tuition_fee : null,
            'service_charge' => $chargeVisible
                ? app(ApplicationCatalog::class)->serviceChargeFor($this->resource, $applicant)
                : null,
            'apply_link' => $applyVisible ? $this->apply_link : null,
            'university' => $this->whenLoaded('university', fn () => [
                'name' => $this->university?->name,
                'slug' => $this->university?->slug,
            ]),
        ];
    }
}

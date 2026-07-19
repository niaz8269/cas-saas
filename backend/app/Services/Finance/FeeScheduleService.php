<?php

namespace App\Services\Finance;

use App\Models\Application;
use App\Models\Scholarship;
use App\Services\Admissions\ApplicationCatalog;

/**
 * Proposes the invoice lines for a student's application straight from the
 * course's fee structure — tuition and hostel (post-scholarship where an award
 * applies) plus the CAS service charge from the program's charge matrix. The
 * Finance officer reviews, edits and adds lines (admission/visa/etc.) before
 * issuing; nothing here is persisted.
 */
class FeeScheduleService
{
    public function __construct(private readonly ApplicationCatalog $catalog) {}

    /**
     * @return array<string, mixed>
     */
    public function for(Application $application): array
    {
        $application->loadMissing(['program', 'university', 'scholarship', 'student']);

        $program = $application->program;
        $scholarship = $application->scholarship;
        // A student sourced by an agent is charged the agent tier of the matrix.
        $applicant = $application->agent_id ? 'agent' : 'student';

        $currency = $program?->currency
            ?? ($program !== null ? data_get($program->service_charges, 'currency') : null)
            ?? 'USD';

        $lines = [];

        if ($program !== null) {
            $benefit = $this->scholarshipBenefit($scholarship, $program->level);

            $tuition = $benefit['tuition_after'] ?? $scholarship?->tuition_after ?? $program->tuition_fee;
            if ($this->positive($tuition)) {
                $lines[] = $this->line('tuition', $scholarship ? 'Tuition (after scholarship)' : 'Tuition fee', $tuition, $currency);
            }

            $hostel = $benefit['hostel_after'] ?? $scholarship?->hostel_after ?? $program->hostel_fee;
            if ($this->positive($hostel)) {
                $lines[] = $this->line('hostel', $scholarship ? 'Hostel (after scholarship)' : 'Hostel fee', $hostel, $currency);
            }

            $service = $this->catalog->serviceChargeFor($program, $applicant, $scholarship?->id);
            if ($service !== null && $this->positive($service['amount'])) {
                $lines[] = $this->line('service_charge', 'CAS service charge', $service['amount'], $service['currency']);
            }
        }

        return [
            'party_type' => 'student',
            'party_id' => $application->student_id,
            'application_id' => $application->id,
            'applicant' => $applicant,
            'currency' => $currency,
            'context' => [
                'application_code' => $application->application_code,
                'student' => $application->student?->full_name,
                'program' => $program?->name,
                'university' => $application->university?->name,
                'scholarship' => $scholarship?->name,
            ],
            'lines' => array_map(fn ($l) => [
                ...$l,
                'currency_mismatch' => $l['currency'] !== $currency,
            ], $lines),
        ];
    }

    /**
     * @return array{fee_type: string, description: string, qty: int, unit_price: float, currency: string}
     */
    private function line(string $feeType, string $description, mixed $amount, string $currency): array
    {
        return [
            'fee_type' => $feeType,
            'description' => $description,
            'qty' => 1,
            'unit_price' => round((float) $amount, 2),
            'currency' => $currency,
        ];
    }

    /**
     * Per-degree-level benefit for the scholarship (bachelor/master/phd), if defined.
     *
     * @return array<string, mixed>
     */
    private function scholarshipBenefit(?Scholarship $scholarship, ?string $level): array
    {
        if ($scholarship === null || $level === null || ! is_array($scholarship->benefits)) {
            return [];
        }

        return $scholarship->benefits[$level] ?? [];
    }

    private function positive(mixed $value): bool
    {
        return $value !== null && $value !== '' && (float) $value > 0;
    }
}

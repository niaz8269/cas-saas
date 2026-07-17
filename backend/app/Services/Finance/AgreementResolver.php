<?php

namespace App\Services\Finance;

use App\Models\Application;
use App\Models\UniversityAgreement;
use Carbon\CarbonInterface;

/**
 * Picks the governing commission agreement for an application:
 * program-specific beats university-wide; must be valid at the reference
 * date (submission date, falling back to now); newest valid_from wins
 * within the same specificity.
 */
class AgreementResolver
{
    public function resolve(Application $application, ?CarbonInterface $asOf = null): ?UniversityAgreement
    {
        $asOf = $asOf ?? $application->submitted_at ?? now();

        $candidates = UniversityAgreement::query()
            ->where('university_id', $application->university_id)
            ->where(fn ($q) => $q->whereNull('valid_from')->orWhere('valid_from', '<=', $asOf))
            ->where(fn ($q) => $q->whereNull('valid_to')->orWhere('valid_to', '>=', $asOf))
            ->where(fn ($q) => $q->whereNull('program_id')->orWhere('program_id', $application->program_id))
            ->orderByRaw('program_id IS NULL') // program-specific first
            ->orderByDesc('valid_from')
            ->get();

        return $candidates->first();
    }
}

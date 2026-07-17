<?php

namespace App\Models;

use Database\Factories\UniversityAgreementFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Commission terms per university (optionally per program). Drives the
 * expected-commission computation for every application (M5).
 */
class UniversityAgreement extends Model
{
    /** @use HasFactory<UniversityAgreementFactory> */
    use HasFactory;

    protected $fillable = [
        'university_id',
        'program_id',
        'commission_type',
        'commission_value',
        'currency',
        'eligibility_trigger',
        'valid_from',
        'valid_to',
    ];

    protected function casts(): array
    {
        return [
            'commission_value' => 'decimal:2',
            'valid_from' => 'date',
            'valid_to' => 'date',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id');
    }
}

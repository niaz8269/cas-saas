<?php

namespace App\Models;

use Database\Factories\ProgramFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Program extends Model
{
    /** @use HasFactory<ProgramFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'university_id',
        'name',
        'level',
        'teaching_language',
        'duration_months',
        'tuition_fee',
        'hostel_fee',
        'currency',
        'apply_link',
        'requirements',
        'service_charges',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'duration_months' => 'integer',
            'tuition_fee' => 'decimal:2',
            'hostel_fee' => 'decimal:2',
            'requirements' => 'array',
            'service_charges' => 'array',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function intakes(): HasMany
    {
        return $this->hasMany(Intake::class);
    }

    /** Scholarships (of the same university) that support this program. */
    public function scholarships(): BelongsToMany
    {
        return $this->belongsToMany(Scholarship::class, 'program_scholarships');
    }
}

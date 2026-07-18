<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A prior academic qualification for a student (ADR-0008). Captured at
 * application time; a student may have several (matric → intermediate →
 * bachelor). The most-recent completed one drives eligibility display.
 */
class StudentEducation extends Model
{
    protected $table = 'student_education';

    protected $fillable = [
        'student_id',
        'level',
        'degree_name',
        'institution',
        'board_or_university',
        'country_id',
        'major',
        'start_year',
        'end_year',
        'grade_type',
        'grade_value',
        'is_completed',
    ];

    protected function casts(): array
    {
        return [
            'is_completed' => 'boolean',
            'start_year' => 'integer',
            'end_year' => 'integer',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }
}

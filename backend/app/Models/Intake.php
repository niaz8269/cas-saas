<?php

namespace App\Models;

use Database\Factories\IntakeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Intake extends Model
{
    /** @use HasFactory<IntakeFactory> */
    use HasFactory;

    protected $fillable = [
        'university_id',
        'course_id',
        'name',
        'start_date',
        'application_deadline',
        'seats',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'application_deadline' => 'date',
            'seats' => 'integer',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}

<?php

namespace App\Models;

use Database\Factories\CourseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Course extends Model
{
    /** @use HasFactory<CourseFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'university_id',
        'name',
        'level',
        'duration_months',
        'tuition_fee',
        'currency',
        'requirements',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'duration_months' => 'integer',
            'tuition_fee' => 'decimal:2',
            'requirements' => 'array',
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
}

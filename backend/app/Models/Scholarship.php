<?php

namespace App\Models;

use Database\Factories\ScholarshipFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Scholarship extends Model
{
    /** @use HasFactory<ScholarshipFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'university_id',
        'name',
        'type',
        'coverage',
        'criteria',
        'deadline',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'criteria' => 'array',
            'deadline' => 'date',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }
}

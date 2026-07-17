<?php

namespace App\Models;

use Database\Factories\ScholarshipFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Scholarship extends Model
{
    /** @use HasFactory<ScholarshipFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'university_id',
        'name',
        'slug',
        'type',
        'coverage',
        'amount',
        'currency',
        'criteria',
        'description',
        'eligibility',
        'how_to_apply',
        'apply_link',
        'deadline',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'criteria' => 'array',
            'amount' => 'decimal:2',
            'deadline' => 'date',
        ];
    }

    /**
     * Auto-generate a stable, unique slug from the name on create when one
     * is not supplied (website URLs depend on it — ADR-0007).
     */
    protected static function booted(): void
    {
        static::creating(function (Scholarship $scholarship) {
            if (empty($scholarship->slug)) {
                $base = Str::slug($scholarship->name) ?: 'scholarship';
                $slug = $base;
                $i = 2;

                while (static::withTrashed()->where('slug', $slug)->exists()) {
                    $slug = "{$base}-{$i}";
                    $i++;
                }

                $scholarship->slug = $slug;
            }
        });
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }
}

<?php

namespace App\Models;

use App\Models\Concerns\HasAudienceVisibility;
use Database\Factories\ScholarshipFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Scholarship extends Model
{
    /** @use HasFactory<ScholarshipFactory> */
    use HasAudienceVisibility, HasFactory, SoftDeletes;

    /** Sections whose public visibility an admin can configure per audience. */
    public const GATEABLE_SECTIONS = ['amount', 'coverage', 'deadline', 'how_to_apply'];

    protected $fillable = [
        'university_id',
        'scope',
        'name',
        'slug',
        'type',
        'coverage',
        'amount',
        'tuition_after',
        'hostel_after',
        'stipend_monthly',
        'currency',
        'criteria',
        'description',
        'eligibility',
        'how_to_apply',
        'apply_link',
        'deadline',
        'benefits',
        'visibility',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'criteria' => 'array',
            'benefits' => 'array',
            'amount' => 'decimal:2',
            'tuition_after' => 'decimal:2',
            'hostel_after' => 'decimal:2',
            'stipend_monthly' => 'decimal:2',
            'deadline' => 'date',
            'visibility' => 'array',
        ];
    }

    /** Universities that enrol students under this award (government scope). */
    public function universities(): BelongsToMany
    {
        return $this->belongsToMany(University::class, 'scholarship_universities');
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

<?php

namespace App\Models;

use Database\Factories\UniversityFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class University extends Model
{
    /** @use HasFactory<UniversityFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'slug',
        'country_id',
        'city',
        'address',
        'website',
        'logo_path',
        'cover_path',
        'status',
        'moe_listed',
        'nearest_airport',
        'about',
        'apply_link',
        'requirements',
        'representative_professor',
    ];

    protected function casts(): array
    {
        return [
            'moe_listed' => 'boolean',
            'requirements' => 'array',
            'representative_professor' => 'array',
        ];
    }

    /**
     * Auto-generate a stable, unique slug from the name on create when one
     * is not supplied (website URLs depend on it — ADR-0005).
     */
    protected static function booted(): void
    {
        static::creating(function (University $university) {
            if (empty($university->slug)) {
                $university->slug = static::uniqueSlug($university->name);
            }
        });
    }

    public static function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'university';
        $slug = $base;
        $i = 2;

        while (static::withTrashed()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(UniversityContact::class);
    }

    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }

    public function intakes(): HasMany
    {
        return $this->hasMany(Intake::class);
    }

    public function scholarships(): HasMany
    {
        return $this->hasMany(Scholarship::class);
    }

    public function agreements(): HasMany
    {
        return $this->hasMany(UniversityAgreement::class);
    }
}

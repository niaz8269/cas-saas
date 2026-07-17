<?php

namespace App\Models;

use Database\Factories\UniversityFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class University extends Model
{
    /** @use HasFactory<UniversityFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'country_id',
        'city',
        'website',
        'status',
    ];

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

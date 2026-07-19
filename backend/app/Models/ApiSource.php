<?php

namespace App\Models;

use Database\Factories\ApiSourceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApiSource extends Model
{
    /** @use HasFactory<ApiSourceFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'type',
        'university_id',
        'default_program_id',
        'website_url',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    /** For application-ingestion sources: the university the site belongs to. */
    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    /** Default program a submission maps to (e.g. MBBS) unless overridden. */
    public function defaultProgram(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'default_program_id');
    }
}

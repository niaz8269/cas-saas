<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/** A student's or partner's own words, public only once consented and approved. */
class Testimonial extends Model
{
    use Auditable, SoftDeletes;

    public const AUDIENCES = ['student', 'agent'];

    public const STATUSES = ['pending', 'approved', 'rejected'];

    protected $fillable = [
        'audience', 'student_id', 'agent_id', 'name', 'headline', 'country', 'quote',
        'consent_public', 'consent_at', 'status', 'sort_order', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'consent_public' => 'boolean',
            'consent_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    /** What the public site may show: approved AND the author agreed to it. */
    public function scopePublic(Builder $query): Builder
    {
        return $query->where('status', 'approved')->where('consent_public', true);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}

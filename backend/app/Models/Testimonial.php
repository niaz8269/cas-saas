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

    /** What a student can tick as "services I used". */
    public const STUDENT_SERVICES = ['admission', 'scholarship', 'visa', 'arrival', 'accommodation', 'language'];

    /** What a partner can tick as "what I value most". */
    public const PARTNER_STRENGTHS = ['commission', 'communication', 'portal', 'speed', 'support', 'transparency'];

    public const DEGREES = ['bachelor', 'master', 'phd', 'diploma', 'non_degree'];

    public const FOUND_US = ['friend', 'agent', 'social', 'search', 'event', 'other'];

    public const REFERRED = ['1-10', '11-50', '51-200', '200+'];

    protected $fillable = [
        'audience', 'student_id', 'agent_id', 'name', 'headline', 'country', 'quote',
        'photo_path', 'title', 'university', 'degree', 'program', 'intake_year', 'services', 'found_us',
        'recommend', 'partner_since', 'students_referred',
        'consent_public', 'consent_at', 'status', 'sort_order', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'consent_public' => 'boolean',
            'recommend' => 'boolean',
            'services' => 'array',
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

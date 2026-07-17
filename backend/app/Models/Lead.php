<?php

namespace App\Models;

use App\Services\Auth\ScopeResolver;
use Database\Factories\LeadFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Intake record. Statuses:
 * new → assigned → contacted → qualified → converted | unqualified | lost | duplicate.
 */
class Lead extends Model
{
    /** @use HasFactory<LeadFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'passport_no',
        'country_id',
        'website_source_id',
        'marketing_source_id',
        'campaign_id',
        'agent_id',
        'assigned_user_id',
        'intake_route',
        'status',
        'student_id',
        'duplicate_of',
        'message',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function websiteSource(): BelongsTo
    {
        return $this->belongsTo(WebsiteSource::class);
    }

    public function marketingSource(): BelongsTo
    {
        return $this->belongsTo(MarketingSource::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function duplicateOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'duplicate_of');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /**
     * Constrain to the records visible under the user's resolved
     * leads.view scope (mirrors LeadPolicy::view).
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        $scope = app(ScopeResolver::class)->resolve($user, 'leads', 'view');

        return match ($scope) {
            'global' => $query,
            'branch' => $query->whereHas('assignee', fn ($q) => $q->where('branch_id', $user->branch_id)),
            'department' => $query->whereHas('assignee', fn ($q) => $q->where('department_id', $user->department_id)),
            'assigned', 'own' => $query->where('assigned_user_id', $user->id),
            default => $query->whereRaw('1 = 0'),
        };
    }
}

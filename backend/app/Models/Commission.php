<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Services\Auth\ScopeResolver;
use Database\Factories\CommissionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One commission per application. Lifecycle (report §5.6):
 * expected → pending_arrival → eligible → invoiced → received.
 * CAS becomes eligible only after arrival + registration + first-year
 * fee paid. Every transition goes through CommissionEngine and is
 * written to the immutable commission_status_history.
 */
class Commission extends Model
{
    /** @use HasFactory<CommissionFactory> */
    use Auditable, HasFactory, SoftDeletes;

    protected $fillable = [
        'application_id',
        'university_id',
        'agreement_id',
        'currency',
        'expected_amount',
        'eligible_amount',
        'invoiced_amount',
        'received_amount',
        'status',
        'eligibility_confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'expected_amount' => 'decimal:2',
            'eligible_amount' => 'decimal:2',
            'invoiced_amount' => 'decimal:2',
            'received_amount' => 'decimal:2',
            'eligibility_confirmed_at' => 'datetime',
        ];
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function agreement(): BelongsTo
    {
        return $this->belongsTo(UniversityAgreement::class, 'agreement_id');
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(CommissionStatusHistory::class)
            ->latest('created_at')
            ->latest('id');
    }

    public function payables(): HasMany
    {
        return $this->hasMany(AgentPayable::class);
    }

    /**
     * Visibility under the user's commission.view scope (mirrors
     * CommissionPolicy::view).
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        $scope = app(ScopeResolver::class)->resolve($user, 'commission', 'view');

        return match ($scope) {
            'global', 'branch', 'department' => $query,
            'assigned', 'own' => $query->whereHas(
                'application.student',
                fn ($q) => $q->where('assigned_counselor_id', $user->id),
            ),
            default => $query->whereRaw('1 = 0'),
        };
    }
}

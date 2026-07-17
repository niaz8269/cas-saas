<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Services\Auth\ScopeResolver;
use Database\Factories\VisaCaseFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Dedicated visa case per admitted application. Statuses (§5.8):
 * not_started → documents_collection → appointment_booked → submitted
 * → approved | rejected → travel_ready. Transitions run through
 * VisaWorkflow (immutable history).
 */
class VisaCase extends Model
{
    /** @use HasFactory<VisaCaseFactory> */
    use Auditable, HasFactory, SoftDeletes;

    protected $fillable = [
        'application_id',
        'student_id',
        'assigned_visa_officer_id',
        'status',
        'appointment_at',
        'submitted_at',
        'decision_at',
        'travel_ready_at',
    ];

    protected function casts(): array
    {
        return [
            'appointment_at' => 'datetime',
            'submitted_at' => 'datetime',
            'decision_at' => 'datetime',
            'travel_ready_at' => 'datetime',
        ];
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function officer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_visa_officer_id');
    }

    public function checklistItems(): HasMany
    {
        return $this->hasMany(VisaChecklistItem::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(VisaStatusHistory::class)
            ->latest('created_at')
            ->latest('id');
    }

    /**
     * Visibility under the user's visa.view scope: global/branch/department
     * see all; assigned = the visa officer or the student's counselor.
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        $scope = app(ScopeResolver::class)->resolve($user, 'visa', 'view');

        return match ($scope) {
            'global', 'branch', 'department' => $query,
            'assigned', 'own' => $query->where(fn ($q) => $q
                ->where('assigned_visa_officer_id', $user->id)
                ->orWhereHas('student', fn ($sq) => $sq->where('assigned_counselor_id', $user->id))),
            default => $query->whereRaw('1 = 0'),
        };
    }
}

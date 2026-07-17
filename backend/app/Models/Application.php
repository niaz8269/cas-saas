<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Services\Auth\ScopeResolver;
use Database\Factories\ApplicationFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * University application (multiple per student). Statuses:
 * draft → under_review → documents_pending → submitted → offer_received
 * → accepted | rejected | withdrawn | deferred.
 * Transitions run through ApplicationWorkflow (immutable history).
 */
class Application extends Model
{
    /** @use HasFactory<ApplicationFactory> */
    use Auditable, HasFactory, SoftDeletes;

    protected $fillable = [
        'application_code',
        'student_id',
        'university_id',
        'program_id',
        'intake_id',
        'scholarship_id',
        'agent_id',
        'assigned_admissions_id',
        'status',
        'submitted_at',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id');
    }

    public function intake(): BelongsTo
    {
        return $this->belongsTo(Intake::class);
    }

    public function scholarship(): BelongsTo
    {
        return $this->belongsTo(Scholarship::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function admissionsOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_admissions_id');
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(ApplicationStatusHistory::class)
            ->latest('created_at')
            ->latest('id'); // deterministic within same-second writes
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    public function offers(): HasMany
    {
        return $this->hasMany(Offer::class);
    }

    public function visaCase(): HasOne
    {
        return $this->hasOne(VisaCase::class);
    }

    /**
     * Visibility under the user's applications.view scope. `assigned`
     * covers both the admissions officer and the student's counselor.
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        $scope = app(ScopeResolver::class)->resolve($user, 'applications', 'view');

        return match ($scope) {
            'global' => $query,
            'branch' => $query->whereHas('student', fn ($q) => $q->where('branch_id', $user->branch_id)),
            'department' => $query->whereHas('admissionsOfficer', fn ($q) => $q->where('department_id', $user->department_id)),
            'assigned', 'own' => $query->where(fn ($q) => $q
                ->where('assigned_admissions_id', $user->id)
                ->orWhereHas('student', fn ($sq) => $sq->where('assigned_counselor_id', $user->id))),
            default => $query->whereRaw('1 = 0'),
        };
    }
}

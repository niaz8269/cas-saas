<?php

namespace App\Models;

use App\Services\Auth\ScopeResolver;
use Database\Factories\StudentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * The permanent student identity. Statuses:
 * active → in_process → enrolled → arrived | withdrawn | inactive.
 */
class Student extends Model
{
    /** @use HasFactory<StudentFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'student_code',
        'first_name',
        'last_name',
        'email',
        'phone',
        'passport_no',
        'dob',
        'gender',
        'country_id',
        'branch_id',
        'agent_id',
        'assigned_counselor_id',
        'status',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'dob' => 'date',
        ];
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function counselor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_counselor_id');
    }

    public function guardians(): HasMany
    {
        return $this->hasMany(StudentGuardian::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class)->latest('created_at');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /**
     * Constrain to the records visible under the user's resolved
     * students.view scope (mirrors StudentPolicy::view).
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        $scope = app(ScopeResolver::class)->resolve($user, 'students', 'view');

        return match ($scope) {
            'global' => $query,
            'branch', 'department' => $query->where('branch_id', $user->branch_id),
            'assigned' => $query->where('assigned_counselor_id', $user->id),
            'own' => $query->where(fn ($q) => $q
                ->where('created_by', $user->id)
                ->orWhere('assigned_counselor_id', $user->id)),
            default => $query->whereRaw('1 = 0'),
        };
    }
}

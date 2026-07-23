<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Services\Auth\ScopeResolver;
use Database\Factories\StudentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * The permanent student identity. Statuses:
 * active → in_process → enrolled → arrived | withdrawn | inactive.
 * Also the Authenticatable behind the `student` portal guard (ADR-0004):
 * NULL password = portal not activated.
 */
class Student extends Authenticatable
{
    /** @use HasFactory<StudentFactory> */
    use Auditable, HasApiTokens, HasFactory, SoftDeletes;

    protected $fillable = [
        'student_code',
        'first_name',
        'last_name',
        'chinese_name',
        'email',
        'alternate_email',
        'phone',
        'wechat_id',
        'skype_id',
        'native_language',
        'passport_no',
        'passport_issue_date',
        'passport_expiry_date',
        'dob',
        'place_of_birth',
        'gender',
        'marital_status',
        'religion',
        'english_test',
        'english_test_score',
        'english_test_date',
        'permanent_address',
        'current_address',
        'city',
        'postal_code',
        'country_id',
        'branch_id',
        'agent_id',
        'assigned_counselor_id',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'dob' => 'date',
            'passport_issue_date' => 'date',
            'passport_expiry_date' => 'date',
            'english_test_date' => 'date',
            'password' => 'hashed',
            'last_login_at' => 'datetime',
            'email_verified_at' => 'datetime',
        ];
    }

    public function hasVerifiedEmail(): bool
    {
        return $this->email_verified_at !== null;
    }

    public function markEmailAsVerified(): void
    {
        $this->forceFill(['email_verified_at' => now()])->save();
    }

    /** The value hashed into the verification link (detects an email change). */
    public function verificationHash(): string
    {
        return sha1($this->email);
    }

    /** Next STU-{year}-{5-digit} code; retries on the (rare) collision. */
    public static function nextCode(): string
    {
        $year = now()->year;
        $sequence = static::withTrashed()->count() + 1;

        do {
            $code = sprintf('STU-%d-%05d', $year, $sequence);
            $sequence++;
        } while (static::withTrashed()->where('student_code', $code)->exists());

        return $code;
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

    public function education(): HasMany
    {
        return $this->hasMany(StudentEducation::class)->latest('end_year');
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

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    public function communications(): HasMany
    {
        return $this->hasMany(Communication::class);
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

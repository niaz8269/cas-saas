<?php

namespace App\Models;

use Database\Factories\AgentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Partner / sub-agent / sub-sub-agent hierarchy (self-referencing).
 * Commission shares cascade down this tree (M5). Also the Authenticatable
 * behind the `agent` portal guard (ADR-0004): NULL password = portal
 * not activated.
 */
class Agent extends Authenticatable
{
    /** @use HasFactory<AgentFactory> */
    use HasApiTokens, HasFactory, SoftDeletes;

    protected $fillable = [
        'agent_code',
        'name',
        'type',
        'parent_agent_id',
        'email',
        'phone',
        'country_id',
        'status',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'last_login_at' => 'datetime',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_agent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_agent_id');
    }

    public function agreements(): HasMany
    {
        return $this->hasMany(AgentAgreement::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }
}

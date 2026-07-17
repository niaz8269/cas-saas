<?php

namespace App\Models;

use Database\Factories\AgentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Partner / sub-agent / sub-sub-agent hierarchy (self-referencing).
 * Commission shares cascade down this tree (M5).
 */
class Agent extends Model
{
    /** @use HasFactory<AgentFactory> */
    use HasFactory, SoftDeletes;

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

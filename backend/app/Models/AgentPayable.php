<?php

namespace App\Models;

use Database\Factories\AgentPayableFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Agent share of a received commission (payable → paid), computed by
 * CommissionEngine from agent_agreements across the hierarchy.
 */
class AgentPayable extends Model
{
    /** @use HasFactory<AgentPayableFactory> */
    use HasFactory;

    protected $fillable = [
        'commission_id',
        'agent_id',
        'amount',
        'currency',
        'status',
        'computed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'computed_at' => 'datetime',
        ];
    }

    public function commission(): BelongsTo
    {
        return $this->belongsTo(Commission::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(AgentPayment::class);
    }
}

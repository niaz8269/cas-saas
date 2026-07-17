<?php

namespace App\Models;

use Database\Factories\AgentAgreementFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentAgreement extends Model
{
    /** @use HasFactory<AgentAgreementFactory> */
    use HasFactory;

    protected $fillable = [
        'agent_id',
        'share_type',
        'share_value',
        'applies_to',
        'valid_from',
        'valid_to',
    ];

    protected function casts(): array
    {
        return [
            'share_value' => 'decimal:2',
            'applies_to' => 'array',
            'valid_from' => 'date',
            'valid_to' => 'date',
        ];
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}

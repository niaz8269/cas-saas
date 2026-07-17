<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Payout evidence against an agent payable (reference + document).
 */
class AgentPayment extends Model
{
    protected $fillable = [
        'agent_payable_id',
        'amount',
        'method',
        'reference',
        'document_id',
        'paid_at',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    public function payable(): BelongsTo
    {
        return $this->belongsTo(AgentPayable::class, 'agent_payable_id');
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}

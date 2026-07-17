<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable commission trail — written by CommissionEngine only.
 */
class CommissionStatusHistory extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'commission_status_history';

    protected $fillable = [
        'commission_id',
        'from_status',
        'to_status',
        'amount',
        'reference',
        'changed_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    public function commission(): BelongsTo
    {
        return $this->belongsTo(Commission::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}

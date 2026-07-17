<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable visa trail — written by VisaWorkflow only.
 */
class VisaStatusHistory extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'visa_status_history';

    protected $fillable = [
        'visa_case_id',
        'from_status',
        'to_status',
        'changed_by',
        'note',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function visaCase(): BelongsTo
    {
        return $this->belongsTo(VisaCase::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}

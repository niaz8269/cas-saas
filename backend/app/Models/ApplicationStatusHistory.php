<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable status trail — created by ApplicationWorkflow only,
 * never updated or deleted.
 */
class ApplicationStatusHistory extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'application_status_history';

    protected $fillable = [
        'application_id',
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

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}

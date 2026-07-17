<?php

namespace App\Models;

use Database\Factories\WorkflowTransitionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Unified, append-only cross-entity transition log (report §5.9). Each
 * domain state change (application/visa/commission/…) writes one row here
 * in addition to its own typed *_status_history.
 */
class WorkflowTransition extends Model
{
    /** @use HasFactory<WorkflowTransitionFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'entity_type',
        'entity_id',
        'from_state',
        'to_state',
        'actor_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}

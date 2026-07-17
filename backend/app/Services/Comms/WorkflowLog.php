<?php

namespace App\Services\Comms;

use App\Models\WorkflowTransition;

/**
 * Writes the unified, cross-entity transition log (report §5.9). Each
 * domain state machine calls this in addition to its own typed
 * *_status_history, giving analytics and SLA one place to read every
 * handover regardless of entity.
 */
class WorkflowLog
{
    public function record(string $entityType, int $entityId, ?string $from, string $to, ?int $actorId): WorkflowTransition
    {
        return WorkflowTransition::create([
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'from_state' => $from,
            'to_state' => $to,
            'actor_id' => $actorId,
            'created_at' => now(),
        ]);
    }
}

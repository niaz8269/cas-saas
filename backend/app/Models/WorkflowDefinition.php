<?php

namespace App\Models;

use Database\Factories\WorkflowDefinitionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Declarative workflow for an entity type: its states, allowed
 * transitions and per-transition SLA (hours). Drives next-owner tasks
 * and escalation timers (report §5.9).
 */
class WorkflowDefinition extends Model
{
    /** @use HasFactory<WorkflowDefinitionFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'entity_type',
        'states',
        'transitions',
        'sla',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'states' => 'array',
            'transitions' => 'array',
            'sla' => 'array',
            'is_active' => 'boolean',
        ];
    }
}

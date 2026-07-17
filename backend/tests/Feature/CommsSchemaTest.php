<?php

use App\Models\Communication;
use App\Models\MessageLog;
use App\Models\Notification;
use App\Models\WorkflowTransition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('creates every comms/automation table from schema.sql', function () {
    foreach ([
        'workflow_definitions', 'workflow_transitions', 'automation_rules',
        'notifications', 'communications', 'message_logs',
    ] as $table) {
        expect(Schema::hasTable($table))->toBeTrue("missing table: {$table}");
    }
});

it('links a communication to its message logs and casts arrays', function () {
    $comm = Communication::factory()->create();
    MessageLog::factory()->count(2)->for($comm, 'communication')->create();

    expect($comm->logs)->toHaveCount(2)
        ->and($comm->student)->not->toBeNull();
});

it('keeps notifications append-only with array channels', function () {
    $notification = Notification::factory()->create(['channels' => ['in_app', 'email']]);

    expect($notification->channels)->toBe(['in_app', 'email'])
        ->and(Notification::UPDATED_AT)->toBeNull()
        ->and($notification->read_at)->toBeNull();
});

it('records a workflow transition row', function () {
    $t = WorkflowTransition::factory()->create(['entity_type' => 'visa', 'to_state' => 'approved']);

    expect($t->entity_type)->toBe('visa')
        ->and($t->to_state)->toBe('approved')
        ->and(WorkflowTransition::UPDATED_AT)->toBeNull();
});

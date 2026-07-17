<?php

use App\Models\Application;
use App\Models\Notification;
use App\Models\Task;
use App\Models\User;
use App\Models\VisaCase;
use App\Models\WorkflowTransition;
use App\Services\Admissions\ApplicationWorkflow;
use App\Services\Visa\VisaWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('writes a unified workflow_transitions row on an application transition', function () {
    $application = Application::factory()->create(['status' => 'under_review']);
    $actor = User::factory()->create();

    app(ApplicationWorkflow::class)->transition($application, 'submitted', $actor);

    $row = WorkflowTransition::where('entity_type', 'application')->where('entity_id', $application->id)->first();

    expect($row)->not->toBeNull()
        ->and($row->from_state)->toBe('under_review')
        ->and($row->to_state)->toBe('submitted')
        ->and($row->actor_id)->toBe($actor->id);
});

it('logs transitions across entities (visa)', function () {
    $case = VisaCase::factory()->create(['status' => 'not_started']);
    $actor = User::factory()->create();

    app(VisaWorkflow::class)->transition($case, 'documents_collection', $actor);

    expect(WorkflowTransition::where('entity_type', 'visa')->where('entity_id', $case->id)
        ->where('to_state', 'documents_collection')->exists())->toBeTrue();
});

it('escalates overdue open tasks once and notifies the assignee', function () {
    $assignee = User::factory()->create();

    $overdue = Task::factory()->create([
        'assignee_id' => $assignee->id, 'status' => 'open',
        'due_at' => now()->subDay(), 'priority' => 'normal', 'escalated_at' => null,
    ]);
    // Not due yet — untouched.
    $future = Task::factory()->create(['status' => 'open', 'due_at' => now()->addDay(), 'escalated_at' => null]);
    // Already done — untouched.
    Task::factory()->create(['status' => 'done', 'due_at' => now()->subDay(), 'escalated_at' => null]);

    $this->artisan('app:escalate-overdue-tasks')->assertSuccessful();

    $overdue->refresh();
    expect($overdue->escalated_at)->not->toBeNull()
        ->and($overdue->priority)->toBe('high')
        ->and($future->refresh()->escalated_at)->toBeNull()
        // the assignee was notified (plus the task.assigned from creation)
        ->and(Notification::where('user_id', $assignee->id)->where('type', 'task.escalated')->exists())->toBeTrue();
});

it('does not re-escalate an already escalated task', function () {
    $stamped = now()->subHours(2);
    $task = Task::factory()->create([
        'status' => 'open', 'due_at' => now()->subDay(), 'escalated_at' => $stamped,
    ]);

    $this->artisan('app:escalate-overdue-tasks')->assertSuccessful();

    expect($task->refresh()->escalated_at->timestamp)->toBe($stamped->timestamp);
});

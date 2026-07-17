<?php

use App\Models\Application;
use App\Models\AutomationRule;
use App\Models\Communication;
use App\Models\Notification;
use App\Models\Student;
use App\Models\User;
use App\Services\Admissions\ApplicationWorkflow;
use App\Services\Comms\AutomationEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

it('does nothing when no active rule matches', function () {
    Queue::fake();
    $student = Student::factory()->create();

    app(AutomationEngine::class)->dispatch('application.status', [
        'to' => 'offer_received', 'student_id' => $student->id,
    ]);

    expect(Communication::count())->toBe(0);
});

it('queues the templated communication when a rule matches', function () {
    Queue::fake();
    $student = Student::factory()->create(['first_name' => 'Ali']);
    AutomationRule::factory()->create([
        'trigger_def' => ['event' => 'application.status', 'to' => 'offer_received'],
        'conditions' => [],
        'actions' => [['type' => 'communication', 'channel' => 'email', 'template' => 'offer_received', 'target' => 'student']],
    ]);

    app(AutomationEngine::class)->dispatch('application.status', [
        'to' => 'offer_received', 'student_id' => $student->id, 'course' => 'MBBS', 'university' => 'JLMU',
    ]);

    $comm = Communication::first();
    expect($comm)->not->toBeNull()
        ->and($comm->template)->toBe('offer_received')
        ->and($comm->channel)->toBe('email')
        ->and($comm->body)->toContain('MBBS')   // template data interpolated
        ->and($comm->body)->toContain('Ali');
});

it('ignores an inactive rule', function () {
    Queue::fake();
    $student = Student::factory()->create();
    AutomationRule::factory()->create([
        'is_active' => false,
        'trigger_def' => ['event' => 'application.status', 'to' => 'offer_received'],
        'actions' => [['type' => 'communication', 'template' => 'offer_received', 'target' => 'student']],
    ]);

    app(AutomationEngine::class)->dispatch('application.status', ['to' => 'offer_received', 'student_id' => $student->id]);

    expect(Communication::count())->toBe(0);
});

it('respects a mismatched target state', function () {
    Queue::fake();
    $student = Student::factory()->create();
    AutomationRule::factory()->create([
        'trigger_def' => ['event' => 'application.status', 'to' => 'accepted'],
        'actions' => [['type' => 'communication', 'template' => 'welcome', 'target' => 'student']],
    ]);

    app(AutomationEngine::class)->dispatch('application.status', ['to' => 'offer_received', 'student_id' => $student->id]);

    expect(Communication::count())->toBe(0);
});

it('filters on conditions', function () {
    Queue::fake();
    $student = Student::factory()->create();
    AutomationRule::factory()->create([
        'trigger_def' => ['event' => 'application.status'],
        'conditions' => ['university' => 'JLMU'],
        'actions' => [['type' => 'communication', 'template' => 'welcome', 'target' => 'student']],
    ]);

    app(AutomationEngine::class)->dispatch('application.status', ['to' => 'x', 'student_id' => $student->id, 'university' => 'Other']);
    expect(Communication::count())->toBe(0);

    app(AutomationEngine::class)->dispatch('application.status', ['to' => 'x', 'student_id' => $student->id, 'university' => 'JLMU']);
    expect(Communication::count())->toBe(1);
});

it('runs a notify action against the resolved target', function () {
    Queue::fake();
    $counselor = User::factory()->create();
    AutomationRule::factory()->create([
        'trigger_def' => ['event' => 'visa.status', 'to' => 'approved'],
        'actions' => [['type' => 'notify', 'target' => 'counselor', 'title' => 'Visa approved', 'notification_type' => 'visa.approved']],
    ]);

    app(AutomationEngine::class)->dispatch('visa.status', ['to' => 'approved', 'counselor_id' => $counselor->id]);

    expect(Notification::where('user_id', $counselor->id)->where('type', 'visa.approved')->exists())->toBeTrue();
});

it('fires end to end through a real application transition', function () {
    Queue::fake();
    $counselor = User::factory()->create();
    $student = Student::factory()->create(['assigned_counselor_id' => $counselor->id]);
    $application = Application::factory()->create(['student_id' => $student->id, 'status' => 'submitted']);
    AutomationRule::factory()->create([
        'trigger_def' => ['event' => 'application.status', 'to' => 'offer_received'],
        'actions' => [['type' => 'communication', 'channel' => 'email', 'template' => 'offer_received', 'target' => 'student']],
    ]);

    app(ApplicationWorkflow::class)->transition($application, 'offer_received', User::factory()->create());

    expect(Communication::where('student_id', $student->id)->where('template', 'offer_received')->exists())->toBeTrue();
});

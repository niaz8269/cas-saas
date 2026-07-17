<?php

use App\Exceptions\ChecklistIncompleteException;
use App\Models\Application;
use App\Models\Commission;
use App\Models\Task;
use App\Models\User;
use App\Models\VisaCase;
use App\Services\Admissions\ApplicationWorkflow;
use App\Services\Visa\VisaWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

uses(RefreshDatabase::class);

function visaActor(): User
{
    return User::factory()->create();
}

function completeRequiredChecklist(VisaCase $case): void
{
    $case->checklistItems()->where('is_required', true)->update(['status' => 'received']);
}

it('opens a case with the standard checklist, idempotently', function () {
    $application = Application::factory()->create();
    $actor = visaActor();
    $workflow = app(VisaWorkflow::class);

    $case = $workflow->openCase($application, $actor);
    $again = $workflow->openCase($application, $actor);

    expect($again->id)->toBe($case->id)
        ->and(VisaCase::count())->toBe(1)
        ->and($case->status)->toBe('not_started')
        ->and($case->student_id)->toBe($application->student_id)
        ->and($case->checklistItems()->count())->toBe(6)
        ->and($case->checklistItems()->where('is_required', true)->count())->toBe(4)
        ->and($case->statusHistory()->count())->toBe(1);
});

it('auto-opens the visa case when an application is accepted', function () {
    $application = Application::factory()->create(['status' => 'offer_received']);

    app(ApplicationWorkflow::class)->transition($application, 'accepted', visaActor());

    $case = VisaCase::where('application_id', $application->id)->first();

    expect($case)->not->toBeNull()
        ->and($case->checklistItems()->count())->toBe(6)
        // the acceptance hook also opened the expected commission (M5)
        ->and(Commission::where('application_id', $application->id)->exists())->toBeTrue();
});

it('stamps milestones along the happy path', function () {
    $case = app(VisaWorkflow::class)->openCase(Application::factory()->create(), $actor = visaActor());
    $workflow = app(VisaWorkflow::class);

    $workflow->transition($case, 'documents_collection', $actor);
    completeRequiredChecklist($case);
    $workflow->transition($case->refresh(), 'appointment_booked', $actor, null, ['appointment_at' => '2026-08-01 09:00:00']);
    $workflow->transition($case->refresh(), 'submitted', $actor);
    $workflow->transition($case->refresh(), 'approved', $actor);
    $workflow->transition($case->refresh(), 'travel_ready', $actor);

    $case->refresh();
    expect($case->status)->toBe('travel_ready')
        ->and($case->appointment_at->format('Y-m-d'))->toBe('2026-08-01')
        ->and($case->submitted_at)->not->toBeNull()
        ->and($case->decision_at)->not->toBeNull()
        ->and($case->travel_ready_at)->not->toBeNull()
        ->and($case->statusHistory()->pluck('to_status')->reverse()->values()->all())
        ->toBe(['not_started', 'documents_collection', 'appointment_booked', 'submitted', 'approved', 'travel_ready']);
});

it('blocks submission while required checklist items are pending', function () {
    $case = app(VisaWorkflow::class)->openCase(Application::factory()->create(), $actor = visaActor());
    $workflow = app(VisaWorkflow::class);

    $workflow->transition($case, 'documents_collection', $actor);
    $workflow->transition($case->refresh(), 'appointment_booked', $actor);

    expect(fn () => $workflow->transition($case->refresh(), 'submitted', $actor))
        ->toThrow(ChecklistIncompleteException::class);
});

it('rejects illegal lifecycle jumps', function () {
    $case = app(VisaWorkflow::class)->openCase(Application::factory()->create(), $actor = visaActor());

    expect(fn () => app(VisaWorkflow::class)->transition($case, 'travel_ready', $actor))
        ->toThrow(ConflictHttpException::class);
});

it('allows re-application after a rejection', function () {
    $case = app(VisaWorkflow::class)->openCase(Application::factory()->create(), $actor = visaActor());
    $workflow = app(VisaWorkflow::class);

    $workflow->transition($case, 'documents_collection', $actor);
    completeRequiredChecklist($case);
    $workflow->transition($case->refresh(), 'appointment_booked', $actor);
    $workflow->transition($case->refresh(), 'submitted', $actor);
    $workflow->transition($case->refresh(), 'rejected', $actor, 'Missing bank guarantee');
    $workflow->transition($case->refresh(), 'documents_collection', $actor);

    expect($case->refresh()->status)->toBe('documents_collection');
});

it('advances the commission and tasks the counselor on travel_ready', function () {
    $actor = visaActor();
    $counselor = visaActor();
    $application = Application::factory()->create(['status' => 'offer_received']);
    $application->student->update(['assigned_counselor_id' => $counselor->id]);

    // Acceptance opens both the expected commission and the visa case.
    app(ApplicationWorkflow::class)->transition($application, 'accepted', $actor);

    $case = VisaCase::where('application_id', $application->id)->first();
    $workflow = app(VisaWorkflow::class);

    $workflow->transition($case, 'documents_collection', $actor);
    completeRequiredChecklist($case);
    $workflow->transition($case->refresh(), 'appointment_booked', $actor);
    $workflow->transition($case->refresh(), 'submitted', $actor);
    $workflow->transition($case->refresh(), 'approved', $actor);
    $workflow->transition($case->refresh(), 'travel_ready', $actor);

    $commission = Commission::where('application_id', $application->id)->first();
    $task = Task::where('related_type', VisaCase::class)->where('related_id', $case->id)->first();

    expect($commission->status)->toBe('pending_arrival')
        ->and($commission->statusHistory()->first()->to_status)->toBe('pending_arrival')
        ->and($task)->not->toBeNull()
        ->and($task->assignee_id)->toBe($counselor->id)
        ->and($task->priority)->toBe('high');
});

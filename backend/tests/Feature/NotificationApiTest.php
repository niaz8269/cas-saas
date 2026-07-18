<?php

use App\Models\Application;
use App\Models\Notification;
use App\Models\Student;
use App\Models\Task;
use App\Models\User;
use App\Services\Admissions\ApplicationWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('requires authentication', function () {
    $this->getJson('/api/v1/notifications')->assertUnauthorized();
});

it('lists only the users own notifications with an unread count', function () {
    $me = actingAsStaffWith([]);
    $other = User::factory()->create();

    Notification::factory()->count(2)->create(['user_id' => $me->id]);
    Notification::factory()->read()->create(['user_id' => $me->id]);
    Notification::factory()->create(['user_id' => $other->id]);

    $this->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.unread', 2);
});

it('filters to unread only', function () {
    $me = actingAsStaffWith([]);
    Notification::factory()->count(2)->create(['user_id' => $me->id]);
    Notification::factory()->read()->create(['user_id' => $me->id]);

    $this->getJson('/api/v1/notifications?unread=1')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('reports the unread count', function () {
    $me = actingAsStaffWith([]);
    Notification::factory()->count(3)->create(['user_id' => $me->id]);

    $this->getJson('/api/v1/notifications/unread-count')
        ->assertOk()
        ->assertJsonPath('unread', 3);
});

it('marks one notification read and 404s across users', function () {
    $me = actingAsStaffWith([]);
    $mine = Notification::factory()->create(['user_id' => $me->id]);
    $foreign = Notification::factory()->create(['user_id' => User::factory()->create()->id]);

    $this->postJson("/api/v1/notifications/{$mine->id}/read")
        ->assertOk()
        ->assertJsonPath('data.read_at', fn ($v) => $v !== null);

    $this->postJson("/api/v1/notifications/{$foreign->id}/read")->assertNotFound();
});

it('marks all read', function () {
    $me = actingAsStaffWith([]);
    Notification::factory()->count(3)->create(['user_id' => $me->id]);

    $this->postJson('/api/v1/notifications/read-all')
        ->assertOk()
        ->assertJsonPath('unread', 0);

    expect(Notification::where('user_id', $me->id)->whereNull('read_at')->count())->toBe(0);
});

it('raises a notification linked to the student when a task is created', function () {
    $assignee = User::factory()->create();
    $student = Student::factory()->create();

    Task::factory()->create(['assignee_id' => $assignee->id, 'student_id' => $student->id, 'title' => 'Qualify programs']);

    $notification = Notification::where('user_id', $assignee->id)->first();

    expect($notification)->not->toBeNull()
        ->and($notification->type)->toBe('task.assigned')
        ->and($notification->title)->toBe('Qualify programs')
        ->and($notification->entity_type)->toBe('student')
        ->and($notification->entity_id)->toBe($student->id);
});

it('notifies the counselor with an application link on offer_received', function () {
    $counselor = User::factory()->create();
    $student = Student::factory()->create(['assigned_counselor_id' => $counselor->id]);
    $application = Application::factory()->create(['student_id' => $student->id, 'status' => 'submitted']);

    app(ApplicationWorkflow::class)->transition($application, 'offer_received', User::factory()->create());

    $notification = Notification::where('user_id', $counselor->id)
        ->where('type', 'application.offer_received')->first();

    expect($notification)->not->toBeNull()
        ->and($notification->entity_type)->toBe('application')
        ->and($notification->entity_id)->toBe($application->id);
});

it('exposes the entity reference through the notifications api', function () {
    $me = actingAsStaffWith([]);
    Notification::factory()->create(['user_id' => $me->id, 'entity_type' => 'application', 'entity_id' => 42]);

    $this->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonPath('data.0.entity_type', 'application')
        ->assertJsonPath('data.0.entity_id', 42);
});

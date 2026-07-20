<?php

use App\Models\Student;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('requires the staff guard', function () {
    $this->getJson('/api/v1/tasks')->assertStatus(401);
});

it('lists only the current users active tasks by default', function () {
    $me = actingAsStaffWith([]);
    Task::factory()->create(['assignee_id' => $me->id, 'status' => 'open', 'title' => 'Mine open']);
    Task::factory()->create(['assignee_id' => $me->id, 'status' => 'done', 'title' => 'Mine done']);
    Task::factory()->create(['status' => 'open', 'title' => 'Someone elses']); // different assignee

    $response = $this->getJson('/api/v1/tasks')->assertOk();

    expect($response->json('meta.total'))->toBe(1)
        ->and($response->json('data.0.title'))->toBe('Mine open');
});

it('creates a task assigned to me by default', function () {
    $me = actingAsStaffWith([]);

    $this->postJson('/api/v1/tasks', ['title' => 'Call the university', 'priority' => 'high'])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Call the university')
        ->assertJsonPath('data.priority', 'high');

    $task = Task::firstOrFail();
    expect($task->assignee_id)->toBe($me->id)
        ->and($task->created_by)->toBe($me->id)
        ->and($task->status)->toBe('open');
});

it('marks a task done', function () {
    $me = actingAsStaffWith([]);
    $task = Task::factory()->create(['assignee_id' => $me->id, 'status' => 'open']);

    $this->patchJson("/api/v1/tasks/{$task->id}", ['status' => 'done'])
        ->assertOk()
        ->assertJsonPath('data.status', 'done');
});

it('cannot change a task that is not mine', function () {
    actingAsStaffWith([]);
    $other = Task::factory()->create(); // different assignee and creator

    $this->patchJson("/api/v1/tasks/{$other->id}", ['status' => 'done'])->assertStatus(403);
    expect($other->refresh()->status)->not->toBe('done');
});

it('flags overdue active tasks', function () {
    $me = actingAsStaffWith([]);
    Task::factory()->create(['assignee_id' => $me->id, 'status' => 'open', 'due_at' => now()->subDay()]);

    $this->getJson('/api/v1/tasks')->assertOk()->assertJsonPath('data.0.overdue', true);
});

it('lists all tasks for a student (any assignee) on the profile endpoint', function () {
    actingAsStaffWith(['students.view.global']);
    $student = Student::factory()->create();
    Task::factory()->count(2)->create(['student_id' => $student->id]);
    Task::factory()->create(); // a different student's task

    $response = $this->getJson("/api/v1/students/{$student->id}/tasks")->assertOk();
    expect($response->json('meta.total'))->toBe(2);
});

it('denies a students tasks without student-view permission', function () {
    actingAsStaffWith([]);
    $student = Student::factory()->create();

    $this->getJson("/api/v1/students/{$student->id}/tasks")->assertStatus(403);
});

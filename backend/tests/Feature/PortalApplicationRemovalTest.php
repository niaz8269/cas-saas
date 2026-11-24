<?php

use App\Models\Agent;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\Notification;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lets a student delete their own draft, and nobody else\'s', function () {
    $student = actingAsStudentPortal();
    $mine = Application::factory()->create(['student_id' => $student->id, 'status' => 'draft']);
    $theirs = Application::factory()->create(['student_id' => Student::factory()->create()->id, 'status' => 'draft']);

    $this->deleteJson("/api/v1/student/applications/{$theirs->id}")->assertNotFound();
    $this->deleteJson("/api/v1/student/applications/{$mine->id}")->assertOk();

    expect(Application::find($mine->id))->toBeNull()
        ->and(Application::withTrashed()->find($mine->id))->not->toBeNull()
        ->and(Application::find($theirs->id))->not->toBeNull();
});

it('does not delete an application that is already with CAS, but lets the student withdraw it', function () {
    $student = actingAsStudentPortal();
    $officer = User::factory()->create();
    $application = Application::factory()->create(['student_id' => $student->id, 'status' => 'documents_pending', 'assigned_admissions_id' => $officer->id]);

    $this->deleteJson("/api/v1/student/applications/{$application->id}")->assertStatus(409);
    expect(Application::find($application->id))->not->toBeNull();

    $this->postJson("/api/v1/student/applications/{$application->id}/withdraw", ['reason' => 'Chose another university'])
        ->assertOk()->assertJsonPath('data.status', 'withdrawn');

    expect($application->refresh()->status)->toBe('withdrawn')
        ->and(ApplicationStatusHistory::where('application_id', $application->id)->where('to_status', 'withdrawn')->first()->note)->toContain('Chose another university')
        ->and(Notification::where('user_id', $officer->id)->where('type', 'application.withdrawn')->count())->toBe(1);
});

it('keeps a draft out of withdrawal, and an accepted or already withdrawn application out of reach', function () {
    $student = actingAsStudentPortal();
    $draft = Application::factory()->create(['student_id' => $student->id, 'status' => 'draft']);
    $accepted = Application::factory()->create(['student_id' => $student->id, 'status' => 'accepted']);
    $withdrawn = Application::factory()->create(['student_id' => $student->id, 'status' => 'withdrawn']);

    $this->postJson("/api/v1/student/applications/{$draft->id}/withdraw")->assertStatus(409);
    $this->postJson("/api/v1/student/applications/{$accepted->id}/withdraw")->assertStatus(409);
    $this->postJson("/api/v1/student/applications/{$withdrawn->id}/withdraw")->assertStatus(409);
    $this->deleteJson("/api/v1/student/applications/{$accepted->id}")->assertStatus(409);

    expect($accepted->refresh()->status)->toBe('accepted');
});

it('lets a partner delete a draft and withdraw a submitted application of their own, not another partner\'s', function () {
    $agent = actingAsAgent();
    $draft = Application::factory()->create(['agent_id' => $agent->id, 'status' => 'draft']);
    $submitted = Application::factory()->create(['agent_id' => $agent->id, 'status' => 'under_review']);
    $other = Application::factory()->create(['agent_id' => Agent::factory()->create()->id, 'status' => 'draft']);

    $this->deleteJson("/api/v1/agent/applications/{$other->id}")->assertNotFound();
    $this->postJson("/api/v1/agent/applications/{$other->id}/withdraw")->assertNotFound();

    $this->deleteJson("/api/v1/agent/applications/{$draft->id}")->assertOk();
    $this->deleteJson("/api/v1/agent/applications/{$submitted->id}")->assertStatus(409);
    $this->postJson("/api/v1/agent/applications/{$submitted->id}/withdraw")->assertOk()->assertJsonPath('data.status', 'withdrawn');

    expect(Application::find($draft->id))->toBeNull()
        ->and(ApplicationStatusHistory::where('application_id', $submitted->id)->where('to_status', 'withdrawn')->first()->note)->toContain('the partner');
});

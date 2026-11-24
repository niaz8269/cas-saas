<?php

use App\Models\Activity;
use App\Models\Agent;
use App\Models\Application;
use App\Models\Notification;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lets a student correct their own details after submitting, and tells the officer', function () {
    $student = actingAsStudentPortal();
    $officer = User::factory()->create();
    Application::factory()->create(['student_id' => $student->id, 'status' => 'documents_pending', 'assigned_admissions_id' => $officer->id]);

    $this->putJson('/api/v1/student/applicant/details', [
        'profile' => ['city' => 'Lahore', 'place_of_birth' => 'Karachi'],
        'guardians' => [['relation' => 'Father', 'name' => 'Ali Khan', 'phone' => '+92 300 1111111']],
        'education' => [['degree_name' => 'FSc Pre-Medical', 'institution' => 'Govt College']],
    ])->assertOk()->assertJsonPath('data.profile.city', 'Lahore');

    $student->refresh();
    expect($student->city)->toBe('Lahore')
        ->and($student->guardians()->count())->toBe(1)
        ->and($student->education()->first()->degree_name)->toBe('FSc Pre-Medical')
        ->and(Activity::where('student_id', $student->id)->where('body', 'like', '%updated by the student%')->exists())->toBeTrue()
        ->and(Notification::where('user_id', $officer->id)->where('type', 'applicant.updated')->count())->toBe(1);
});

it('validates what a student sends', function () {
    actingAsStudentPortal();

    $this->putJson('/api/v1/student/applicant/details', ['profile' => ['dob' => 'not a date', 'alternate_email' => 'nope']])
        ->assertStatus(422)->assertJsonValidationErrors(['profile.dob', 'profile.alternate_email']);
});

it('locks the details once an application of the student is accepted', function () {
    $student = actingAsStudentPortal();
    Application::factory()->create(['student_id' => $student->id, 'status' => 'accepted']);

    $this->putJson('/api/v1/student/applicant/details', ['profile' => ['city' => 'Lahore']])
        ->assertStatus(409)->assertJsonPath('code', 'LOCKED');

    expect($student->refresh()->city)->not->toBe('Lahore');
});

it('refuses details that match another student already at CAS', function () {
    $student = actingAsStudentPortal();
    Student::factory()->create(['passport_no' => 'AB1234567']);

    $this->putJson('/api/v1/student/applicant/details', ['profile' => ['passport_no' => 'ab 1234567']])
        ->assertStatus(409)->assertJsonPath('code', 'DUPLICATE');

    expect($student->refresh()->passport_no)->not->toBe('AB1234567');
});

it('lets a partner update their own student, and nobody else\'s', function () {
    $agent = actingAsAgent();
    $mine = Student::factory()->create(['agent_id' => $agent->id]);
    $theirs = Student::factory()->create(['agent_id' => Agent::factory()->create()->id]);

    $this->putJson("/api/v1/agent/students/{$theirs->id}/details", ['profile' => ['city' => 'Multan']])->assertNotFound();
    $this->putJson("/api/v1/agent/students/{$mine->id}/details", ['profile' => ['city' => 'Multan']])
        ->assertOk()->assertJsonPath('data.profile.city', 'Multan');

    expect($mine->refresh()->city)->toBe('Multan')
        ->and($theirs->refresh()->city)->not->toBe('Multan')
        ->and(Activity::where('student_id', $mine->id)->where('body', 'like', '%updated by partner%')->exists())->toBeTrue();
});

it('sends a change request to the officer and records it, for a student and for a partner', function () {
    $student = actingAsStudentPortal();
    $officer = User::factory()->create();
    $application = Application::factory()->create(['student_id' => $student->id, 'status' => 'under_review', 'assigned_admissions_id' => $officer->id]);

    $this->postJson("/api/v1/student/applications/{$application->id}/change-request", ['message' => 'Please move me to the Master program'])
        ->assertCreated();
    $this->postJson("/api/v1/student/applications/{$application->id}/change-request", ['message' => ''])->assertStatus(422);

    expect(Notification::where('user_id', $officer->id)->where('type', 'application.change_requested')->count())->toBe(1)
        ->and(Activity::where('student_id', $student->id)->where('body', 'like', '%Change requested on%Master program%')->exists())->toBeTrue();

    $agent = actingAsAgent();
    $theirApplication = Application::factory()->create(['agent_id' => $agent->id, 'status' => 'under_review', 'assigned_admissions_id' => $officer->id]);
    $accepted = Application::factory()->create(['agent_id' => $agent->id, 'status' => 'accepted']);

    $this->postJson("/api/v1/agent/applications/{$theirApplication->id}/change-request", ['message' => 'Switch the funding to self-funded'])->assertCreated();
    $this->postJson("/api/v1/agent/applications/{$accepted->id}/change-request", ['message' => 'Too late to change this'])->assertStatus(409);
});

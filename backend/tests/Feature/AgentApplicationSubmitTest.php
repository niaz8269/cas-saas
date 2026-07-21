<?php

use App\Models\Application;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
 * The agent "apply on behalf" wizard reuses the student apply flow
 * ({@see App\Http\Controllers\Api\V1\Portal\Concerns\HandlesPortalApplications}),
 * so the browse/document/submit assertions mirror StudentApplicationSubmitTest.
 * These tests cover only what is agent-specific: the target student must be one
 * of the agent's OWN students, the draft is attributed to the agent (agent_id),
 * and the per-draft ownership guard is keyed on that agent. The shared helpers
 * programRequiringPassport() and draftPayload() live in that student test file.
 */

it('requires the agent guard to create an application', function () {
    [$program] = programRequiringPassport();
    $student = Student::factory()->create();

    $this->postJson('/api/v1/agent/applications', [
        'student_id' => $student->id,
        ...draftPayload($program),
    ])->assertUnauthorized();
});

it('creates a draft for the agent\'s own student and attributes it to the agent', function () {
    [$program, $passport] = programRequiringPassport();
    $agent = actingAsAgent();
    $student = Student::factory()->create(['agent_id' => $agent->id]);

    $this->postJson('/api/v1/agent/applications', [
        'student_id' => $student->id,
        ...draftPayload($program),
    ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.required_documents.0.name', 'Passport');

    $application = Application::firstOrFail();
    expect($application->student_id)->toBe($student->id)
        ->and($application->agent_id)->toBe($agent->id)
        ->and($application->program_id)->toBe($program->id)
        ->and($application->status)->toBe('draft');
});

it('rejects applying for a student that is not the agent\'s own', function () {
    [$program] = programRequiringPassport();
    actingAsAgent();
    // A student that belongs to no-one (or another agent) is off-limits.
    $stranger = Student::factory()->create();

    $this->postJson('/api/v1/agent/applications', [
        'student_id' => $stranger->id,
        ...draftPayload($program),
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('student_id');

    expect(Application::count())->toBe(0);
});

it('submits the agent draft to CAS once documents are complete', function () {
    [$program, $passport] = programRequiringPassport();
    $agent = actingAsAgent();
    $student = Student::factory()->create(['agent_id' => $agent->id]);

    $id = $this->postJson('/api/v1/agent/applications', [
        'student_id' => $student->id,
        ...draftPayload($program),
    ])->json('data.id');

    $this->postJson("/api/v1/agent/applications/{$id}/documents", [
        'document_type_id' => $passport->id,
        'key' => "students/{$student->id}/applications/{$id}/passport.jpg",
        'file_name' => 'passport.jpg',
        'mime' => 'image/jpeg',
        'size' => 1000,
    ])->assertCreated();

    $this->postJson("/api/v1/agent/applications/{$id}/submit")
        ->assertOk()
        ->assertJsonPath('data.status', 'under_review');

    $application = Application::find($id);
    expect($application->status)->toBe('under_review')
        ->and($application->statusHistory()->where('to_status', 'under_review')->exists())->toBeTrue();
});

it('never touches another agent\'s application', function () {
    actingAsAgent();
    $theirs = Application::factory()->create([
        'agent_id' => \App\Models\Agent::factory()->create()->id,
        'status' => 'draft',
    ]);

    $this->postJson("/api/v1/agent/applications/{$theirs->id}/submit")->assertNotFound();
});

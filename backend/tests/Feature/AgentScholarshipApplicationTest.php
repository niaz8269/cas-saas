<?php

use App\Models\Application;
use App\Models\DocumentType;
use App\Models\Major;
use App\Models\Scholarship;
use App\Models\Student;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
 * The agent government-scholarship variant reuses the same create-draft +
 * document + submit flow as the student one (StudentScholarshipApplicationTest);
 * these tests cover only the agent-specific bits — the reference reads are shared
 * (majors/government-scholarships live in HandlesPortalApplications), the target
 * student must be one of the agent's OWN, and the draft is attributed to the agent.
 */

it('exposes the shared majors + government-scholarship reads to agents', function () {
    actingAsAgent();
    Major::create(['name' => 'Computer Science']);
    $uni = University::factory()->create();
    $gov = Scholarship::factory()->create(['scope' => 'government', 'university_id' => null, 'name' => 'CSC', 'status' => 'active']);
    $gov->universities()->attach($uni->id);
    Scholarship::factory()->create(['scope' => 'university', 'status' => 'active']); // internal — hidden

    $this->getJson('/api/v1/agent/majors')->assertOk()->assertJsonFragment(['name' => 'Computer Science']);

    $this->getJson('/api/v1/agent/government-scholarships')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'CSC');
});

it('creates a scholarship draft for an owned student, attributed to the agent', function () {
    $agent = actingAsAgent();
    $student = Student::factory()->create(['agent_id' => $agent->id]);
    $gov = Scholarship::factory()->create(['scope' => 'government', 'university_id' => null, 'status' => 'active']);

    $response = $this->postJson('/api/v1/agent/scholarship-applications', [
        'student_id' => $student->id,
        'scholarship_id' => $gov->id,
        'level' => 'master',
        'preferences' => [['major' => 'Computer Science']],
    ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft');

    $application = Application::findOrFail($response->json('data.id'));
    expect($application->kind)->toBe('scholarship')
        ->and($application->student_id)->toBe($student->id)
        ->and($application->agent_id)->toBe($agent->id)
        ->and($application->scholarship_id)->toBe($gov->id)
        ->and($application->program_id)->toBeNull()
        ->and($application->university_id)->toBeNull();
});

it('rejects a scholarship application for a student that is not the agent\'s own', function () {
    actingAsAgent();
    $stranger = Student::factory()->create();
    $gov = Scholarship::factory()->create(['scope' => 'government', 'university_id' => null, 'status' => 'active']);

    $this->postJson('/api/v1/agent/scholarship-applications', [
        'student_id' => $stranger->id,
        'scholarship_id' => $gov->id,
        'level' => 'bachelor',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('student_id');

    expect(Application::count())->toBe(0);
});

it('submits an agent scholarship draft to Admissions once documents are attached', function () {
    $agent = actingAsAgent();
    $student = Student::factory()->create(['agent_id' => $agent->id]);
    $gov = Scholarship::factory()->create(['scope' => 'government', 'university_id' => null, 'status' => 'active']);
    $passport = DocumentType::factory()->create(['name' => 'Passport']); // part of the general set

    $id = $this->postJson('/api/v1/agent/scholarship-applications', [
        'student_id' => $student->id,
        'scholarship_id' => $gov->id,
        'level' => 'phd',
    ])->json('data.id');

    $this->postJson("/api/v1/agent/applications/{$id}/submit")->assertStatus(422);

    $this->postJson("/api/v1/agent/applications/{$id}/documents", [
        'document_type_id' => $passport->id,
        'key' => "students/{$student->id}/applications/{$id}/passport.jpg",
        'file_name' => 'passport.jpg', 'mime' => 'image/jpeg', 'size' => 1000,
    ])->assertCreated();

    $this->postJson("/api/v1/agent/applications/{$id}/submit")
        ->assertOk()
        ->assertJsonPath('data.status', 'under_review');
});

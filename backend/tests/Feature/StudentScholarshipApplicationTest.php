<?php

use App\Models\Application;
use App\Models\DocumentType;
use App\Models\Major;
use App\Models\Scholarship;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lists majors and only government scholarships', function () {
    actingAsStudentPortal();
    Major::create(['name' => 'Computer Science']);
    $uni = University::factory()->create();
    $gov = Scholarship::factory()->create(['scope' => 'government', 'university_id' => null, 'name' => 'CSC', 'status' => 'active']);
    $gov->universities()->attach($uni->id);
    Scholarship::factory()->create(['scope' => 'university', 'status' => 'active']); // internal — hidden

    $this->getJson('/api/v1/student/majors')->assertOk()->assertJsonFragment(['name' => 'Computer Science']);

    $this->getJson('/api/v1/student/government-scholarships')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'CSC')
        ->assertJsonPath('data.0.universities.0.id', $uni->id);
});

it('creates a government-scholarship draft with no program or university', function () {
    $student = actingAsStudentPortal();
    $gov = Scholarship::factory()->create(['scope' => 'government', 'university_id' => null, 'status' => 'active']);
    $uni = University::factory()->create();

    $response = $this->postJson('/api/v1/student/scholarship-applications', [
        'scholarship_id' => $gov->id,
        'level' => 'master',
        'preferences' => [
            ['major' => 'Computer Science', 'university_id' => $uni->id],
            ['major' => 'Software Engineering'],
        ],
        'profile' => ['city' => 'Lahore'],
    ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft');

    $application = Application::findOrFail($response->json('data.id'));
    expect($application->kind)->toBe('scholarship')
        ->and($application->level)->toBe('master')
        ->and($application->scholarship_id)->toBe($gov->id)
        ->and($application->program_id)->toBeNull()
        ->and($application->university_id)->toBeNull()
        ->and($application->preferences)->toHaveCount(2)
        ->and($application->preferences[0]['major'])->toBe('Computer Science');

    expect($student->refresh()->city)->toBe('Lahore');
});

it('allows at most three preferences', function () {
    actingAsStudentPortal();
    $gov = Scholarship::factory()->create(['scope' => 'government', 'university_id' => null, 'status' => 'active']);

    $this->postJson('/api/v1/student/scholarship-applications', [
        'scholarship_id' => $gov->id,
        'level' => 'bachelor',
        'preferences' => [['major' => 'A'], ['major' => 'B'], ['major' => 'C'], ['major' => 'D']],
    ])->assertStatus(422)->assertJsonValidationErrors('preferences');
});

it('submits a scholarship application to Admissions once documents are attached', function () {
    $student = actingAsStudentPortal();
    $gov = Scholarship::factory()->create(['scope' => 'government', 'university_id' => null, 'status' => 'active']);
    $passport = DocumentType::factory()->create(['name' => 'Passport']); // part of the general set

    $id = $this->postJson('/api/v1/student/scholarship-applications', [
        'scholarship_id' => $gov->id, 'level' => 'phd',
    ])->json('data.id');

    $this->postJson("/api/v1/student/applications/{$id}/submit")->assertStatus(422);

    $this->postJson("/api/v1/student/applications/{$id}/documents", [
        'document_type_id' => $passport->id,
        'key' => "students/{$student->id}/applications/{$id}/passport.jpg",
        'file_name' => 'passport.jpg', 'mime' => 'image/jpeg', 'size' => 1000,
    ])->assertCreated();

    $this->postJson("/api/v1/student/applications/{$id}/submit")
        ->assertOk()
        ->assertJsonPath('data.status', 'under_review');
});

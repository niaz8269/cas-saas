<?php

use App\Models\DocumentType;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Services\Admissions\ApplicationCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/** Seed the general document set the wizard falls back to. */
function seedGeneralDocumentTypes(): void
{
    foreach (ApplicationCatalog::GENERAL_DOCUMENTS as $name) {
        DocumentType::factory()->create(['name' => $name]);
    }
}

it('requires the student guard for availability', function () {
    $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=self')
        ->assertUnauthorized();
});

it('validates the degree and funding options', function () {
    actingAsStudentPortal();

    $this->getJson('/api/v1/student/applications/availability?degree=wizardry&funding=self')
        ->assertStatus(422)
        ->assertJsonValidationErrors('degree');

    $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=maybe')
        ->assertStatus(422)
        ->assertJsonValidationErrors('funding');
});

it('returns programs for a degree tile, excluding other tiles', function () {
    actingAsStudentPortal();
    $uni = University::factory()->create(['status' => 'active']);

    Program::factory()->create(['university_id' => $uni->id, 'name' => 'MBBS', 'level' => 'bachelor', 'status' => 'active']);
    Program::factory()->create(['university_id' => $uni->id, 'name' => 'Computer Science', 'level' => 'bachelor', 'status' => 'active']);

    // MBBS tile → only the medical bachelor.
    $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=self')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'MBBS');

    // BS tile → the general bachelor, not MBBS.
    $this->getJson('/api/v1/student/applications/availability?degree=bs&funding=self')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Computer Science');
});

it('keeps only universities with a matching scholarship in scholarship mode', function () {
    actingAsStudentPortal();
    $withAward = University::factory()->create(['status' => 'active']);
    $withoutAward = University::factory()->create(['status' => 'active']);

    Program::factory()->create(['university_id' => $withAward->id, 'name' => 'MBBS', 'level' => 'bachelor']);
    Program::factory()->create(['university_id' => $withoutAward->id, 'name' => 'MBBS', 'level' => 'bachelor']);
    Scholarship::factory()->create([
        'university_id' => $withAward->id,
        'type' => 'full',
        'coverage' => 'Full tuition',
        'status' => 'active',
    ]);

    $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=scholarship')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.university.id', $withAward->id)
        ->assertJsonCount(1, 'data.0.scholarships');

    // A partial request must not match a full-only award.
    $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=partial')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('resolves the general document set when a program has no configured docs', function () {
    seedGeneralDocumentTypes();
    actingAsStudentPortal();
    $program = Program::factory()->create(['requirements' => ['min_age' => 18]]);

    $this->getJson("/api/v1/student/applications/required-documents?program_id={$program->id}")
        ->assertOk()
        ->assertJsonCount(count(ApplicationCatalog::GENERAL_DOCUMENTS), 'data')
        ->assertJsonFragment(['name' => 'Passport'])
        ->assertJsonFragment(['name' => 'CV / Resume']);
});

it('uses the admin-configured program docs when present', function () {
    seedGeneralDocumentTypes();
    actingAsStudentPortal();
    $passport = DocumentType::where('name', 'Passport')->first();
    $cv = DocumentType::where('name', 'CV / Resume')->first();
    $program = Program::factory()->create(['requirements' => ['documents' => [$passport->id, $cv->id]]]);

    $this->getJson("/api/v1/student/applications/required-documents?program_id={$program->id}")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonFragment(['name' => 'Passport'])
        ->assertJsonFragment(['name' => 'CV / Resume']);
});

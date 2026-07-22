<?php

use App\Models\Application;
use App\Models\DocumentType;
use App\Models\Program;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/** A single required radio field the admin attaches to a university. */
function uniForm(array $extra = []): array
{
    return array_merge([
        'fields' => [
            ['key' => 'preferred_major', 'label' => 'Preferred major', 'type' => 'radio', 'required' => true, 'options' => ['Medicine', 'Engineering']],
        ],
    ], $extra);
}

// ── Admin config ──────────────────────────────────────────────────────────────

it('creates a university with an application form (radio field) and exposes it', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);

    $this->postJson('/api/v1/universities', [
        'name' => 'Peking University',
        'code' => 'PKU-TEST',
        'application_form' => uniForm(['documents' => []]),
    ])
        ->assertCreated()
        ->assertJsonPath('data.application_form.fields.0.type', 'radio')
        ->assertJsonPath('data.application_form.fields.0.options', ['Medicine', 'Engineering']);
});

it('rejects a malformed university application-form spec', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $uni = University::factory()->create();

    $this->patchJson("/api/v1/universities/{$uni->id}", [
        'application_form' => ['fields' => [
            ['key' => 'Bad Key!', 'label' => 'X', 'type' => 'radio'],        // key not snake_case
            ['key' => 'good', 'label' => 'Y', 'type' => 'carrier_pigeon'],   // unknown type
        ]],
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['application_form.fields.0.key', 'application_form.fields.1.type']);
});

// ── Wizard read: university form overrides the program's ────────────────────────

it('shows the university application form instead of the program fields in the wizard', function () {
    actingAsStudentPortal();
    $uni = University::factory()->create(['status' => 'active', 'application_form' => uniForm()]);
    Program::factory()->create([
        'university_id' => $uni->id, 'name' => 'MBBS', 'level' => 'bachelor', 'status' => 'active',
        'requirements' => ['fields' => [['key' => 'program_only', 'label' => 'Ignored', 'type' => 'text']]],
    ]);

    $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=self')
        ->assertOk()
        ->assertJsonCount(1, 'data.0.custom_fields')
        ->assertJsonPath('data.0.custom_fields.0.key', 'preferred_major')
        ->assertJsonPath('data.0.custom_fields.0.type', 'radio');
});

// ── Applicant answers validated against the university form ─────────────────────

it('validates a radio answer against the university form options', function () {
    actingAsStudentPortal();
    $uni = University::factory()->create(['status' => 'active', 'application_form' => uniForm()]);
    $program = Program::factory()->create(['university_id' => $uni->id, 'name' => 'MBBS', 'level' => 'bachelor', 'status' => 'active']);

    $this->postJson('/api/v1/student/applications', [
        'program_id' => $program->id, 'funding' => 'self',
        'custom_fields' => ['preferred_major' => 'Law'], // not an option
    ])->assertStatus(422)->assertJsonValidationErrors('custom_fields.preferred_major');

    $this->postJson('/api/v1/student/applications', [
        'program_id' => $program->id, 'funding' => 'self',
        'custom_fields' => ['preferred_major' => 'Medicine'],
    ])->assertCreated();

    expect(Application::firstOrFail()->custom_fields)->toBe(['preferred_major' => 'Medicine']);
});

// ── Required documents come from the university form ────────────────────────────

it('lets the university application form override the required documents', function () {
    seedGeneralDocumentTypes();
    actingAsStudentPortal();
    $passport = DocumentType::where('name', 'Passport')->first();
    $cv = DocumentType::where('name', 'CV / Resume')->first();

    $uni = University::factory()->create(['status' => 'active', 'application_form' => ['documents' => [$passport->id]]]);
    // The program lists a different doc, but the university form wins.
    $program = Program::factory()->create(['university_id' => $uni->id, 'status' => 'active', 'requirements' => ['documents' => [$cv->id]]]);

    $this->getJson("/api/v1/student/applications/required-documents?program_id={$program->id}")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonFragment(['name' => 'Passport'])
        ->assertJsonMissing(['name' => 'CV / Resume']);
});

<?php

use App\Models\Application;
use App\Models\Program;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/** A program carrying an admin-defined custom-field spec (report item 11). */
function programWithCustomFields(array $fields): Program
{
    $uni = University::factory()->create(['status' => 'active']);

    return Program::factory()->create([
        'university_id' => $uni->id,
        'name' => 'MBBS',
        'level' => 'bachelor',
        'status' => 'active',
        'requirements' => ['fields' => $fields],
    ]);
}

/** The two-field spec reused across the portal tests. */
function sampleFields(): array
{
    return [
        ['key' => 'portfolio_url', 'label' => 'Portfolio URL', 'type' => 'text', 'required' => true],
        ['key' => 'hsk_level', 'label' => 'HSK level', 'type' => 'select', 'required' => false, 'options' => ['HSK4', 'HSK5', 'HSK6']],
    ];
}

// ── Admin config ──────────────────────────────────────────────────────────────

it('persists an admin-defined custom-field spec on a program', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();

    $this->postJson('/api/v1/programs', [
        'university_id' => $university->id,
        'name' => 'MBBS',
        'level' => 'bachelor',
        'requirements' => ['fields' => sampleFields()],
    ])
        ->assertCreated()
        ->assertJsonPath('data.requirements.fields.0.key', 'portfolio_url')
        ->assertJsonPath('data.requirements.fields.1.type', 'select');
});

it('rejects a malformed custom-field spec', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();

    $this->postJson('/api/v1/programs', [
        'university_id' => $university->id,
        'name' => 'MBBS',
        'level' => 'bachelor',
        'requirements' => ['fields' => [
            ['key' => 'Bad Key!', 'label' => 'X', 'type' => 'text'], // key not snake_case
            ['key' => 'good', 'label' => 'Y', 'type' => 'carrier_pigeon'], // unknown type
        ]],
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['requirements.fields.0.key', 'requirements.fields.1.type']);
});

// ── Wizard read ───────────────────────────────────────────────────────────────

it('exposes the custom-field spec to the applicant wizard', function () {
    actingAsStudentPortal();
    programWithCustomFields(sampleFields());

    $this->getJson('/api/v1/student/applications/availability?degree=mbbs&funding=self')
        ->assertOk()
        ->assertJsonPath('data.0.custom_fields.0.key', 'portfolio_url')
        ->assertJsonPath('data.0.custom_fields.0.required', true)
        ->assertJsonPath('data.0.custom_fields.1.options', ['HSK4', 'HSK5', 'HSK6']);
});

// ── Applicant answers ─────────────────────────────────────────────────────────

it('stores validated custom-field answers on the draft', function () {
    actingAsStudentPortal();
    $program = programWithCustomFields(sampleFields());

    $this->postJson('/api/v1/student/applications', [
        'program_id' => $program->id,
        'funding' => 'self',
        'custom_fields' => [
            'portfolio_url' => 'https://folio.example/ali',
            'hsk_level' => 'HSK5',
            'sneaky' => 'ignored', // not in the spec — dropped
        ],
    ])->assertCreated();

    $application = Application::firstOrFail();
    expect($application->custom_fields)->toBe([
        'portfolio_url' => 'https://folio.example/ali',
        'hsk_level' => 'HSK5',
    ]);
});

it('blocks a draft when a required custom field is missing', function () {
    actingAsStudentPortal();
    $program = programWithCustomFields(sampleFields());

    $this->postJson('/api/v1/student/applications', [
        'program_id' => $program->id,
        'funding' => 'self',
        'custom_fields' => ['hsk_level' => 'HSK5'], // portfolio_url (required) omitted
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('custom_fields.portfolio_url');

    expect(Application::count())->toBe(0);
});

it('rejects a select answer outside the configured options', function () {
    actingAsStudentPortal();
    $program = programWithCustomFields(sampleFields());

    $this->postJson('/api/v1/student/applications', [
        'program_id' => $program->id,
        'funding' => 'self',
        'custom_fields' => ['portfolio_url' => 'https://ok', 'hsk_level' => 'HSK9'],
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('custom_fields.hsk_level');
});

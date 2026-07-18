<?php

use App\Models\DocumentType;
use App\Models\Program;
use App\Models\University;
use App\Models\UniversityAgreement;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ── Universities ────────────────────────────────────────────────────────

it('lists universities with search and counts for viewers', function () {
    actingAsStaffWith(['universities.view.global']);
    University::factory()->create(['name' => 'Jilin Medical University', 'code' => 'JLMU']);
    University::factory()->create(['name' => 'Dalian Polytechnic', 'code' => 'DLPU']);

    $this->getJson('/api/v1/universities?q=Jilin')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.code', 'JLMU')
        ->assertJsonStructure(['data' => [['id', 'name', 'code', 'status', 'programs_count']], 'meta']);
});

it('denies university listing without the view permission', function () {
    actingAsStaffWith();

    $this->getJson('/api/v1/universities')->assertStatus(403);
});

it('creates a university for catalog managers', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);

    $this->postJson('/api/v1/universities', [
        'name' => 'Xinjiang Medical University',
        'code' => 'XJMU',
        'city' => 'Urumqi',
    ])
        ->assertCreated()
        ->assertJsonPath('data.code', 'XJMU');

    $this->assertDatabaseHas('universities', ['code' => 'XJMU']);
});

it('rejects duplicate university codes', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    University::factory()->create(['code' => 'XJMU']);

    $this->postJson('/api/v1/universities', ['name' => 'Dup', 'code' => 'XJMU'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['code']);
});

it('forbids viewers from creating universities', function () {
    actingAsStaffWith(['universities.view.global']);

    $this->postJson('/api/v1/universities', ['name' => 'Nope', 'code' => 'NOPE'])
        ->assertStatus(403);
});

it('soft deletes a university', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();

    $this->deleteJson("/api/v1/universities/{$university->id}")->assertNoContent();

    $this->assertSoftDeleted('universities', ['id' => $university->id]);
});

// ── Programs & intakes ──────────────────────────────────────────────────

it('creates a program under a university', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();

    $this->postJson('/api/v1/programs', [
        'university_id' => $university->id,
        'name' => 'MBBS',
        'level' => 'bachelor',
        'teaching_language' => 'English',
        'duration_months' => 72,
        'tuition_fee' => 30000,
        'currency' => 'CNY',
    ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'MBBS')
        ->assertJsonPath('data.teaching_language', 'English');
});

it('stores the per-course service-charge matrix', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();

    $charges = [
        'currency' => 'USD',
        'self' => ['student' => 400, 'agent' => 200],
        'partial' => ['student' => 450, 'agent' => 220],
    ];

    $response = $this->postJson('/api/v1/programs', [
        'university_id' => $university->id,
        'name' => 'MBBS',
        'level' => 'bachelor',
        'service_charges' => $charges,
    ])
        ->assertCreated()
        ->assertJsonPath('data.service_charges.self.student', 400)
        ->assertJsonPath('data.service_charges.partial.agent', 220);

    $program = Program::findOrFail($response->json('data.id'));
    expect($program->service_charges['currency'])->toBe('USD')
        ->and($program->service_charges['self']['agent'])->toBe(200);
});

it('rejects a non-numeric service charge', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();

    $this->postJson('/api/v1/programs', [
        'university_id' => $university->id,
        'name' => 'MBBS',
        'level' => 'bachelor',
        'service_charges' => ['self' => ['student' => 'free']],
    ])->assertStatus(422)->assertJsonValidationErrors('service_charges.self.student');
});

it('stores per-course requirement documents and section toggles', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();
    $passport = DocumentType::factory()->create(['name' => 'Passport']);

    $response = $this->postJson('/api/v1/programs', [
        'university_id' => $university->id,
        'name' => 'PhD Physics',
        'level' => 'phd',
        'requirements' => [
            'documents' => [$passport->id],
            'sections' => ['research' => true, 'study_plan' => true],
        ],
    ])->assertCreated();

    $program = Program::findOrFail($response->json('data.id'));
    expect($program->requirements['documents'])->toBe([$passport->id])
        ->and($program->requirements['sections']['research'])->toBeTrue();
});

it('rejects a required document that does not exist', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();

    $this->postJson('/api/v1/programs', [
        'university_id' => $university->id, 'name' => 'X', 'level' => 'phd',
        'requirements' => ['documents' => [999999]],
    ])->assertStatus(422)->assertJsonValidationErrors('requirements.documents.0');
});

it('updates a program for catalog managers', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $program = Program::factory()->create(['tuition_fee' => 30000, 'apply_link' => null]);

    $this->patchJson("/api/v1/programs/{$program->id}", [
        'name' => 'MBBS (updated)',
        'tuition_fee' => 34000,
        'apply_link' => 'https://apply.example.cn/mbbs',
    ])
        ->assertOk()
        ->assertJsonPath('data.name', 'MBBS (updated)')
        ->assertJsonPath('data.apply_link', 'https://apply.example.cn/mbbs');

    expect((float) $program->refresh()->tuition_fee)->toBe(34000.0);
});

it('denies program updates without catalog manage', function () {
    actingAsStaffWith(['universities.view.global']);
    $program = Program::factory()->create();

    $this->patchJson("/api/v1/programs/{$program->id}", ['name' => 'Nope'])->assertForbidden();
});

it('rejects an intake whose program belongs to another university', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();
    $foreignProgram = Program::factory()->create(); // different university

    $this->postJson('/api/v1/intakes', [
        'university_id' => $university->id,
        'program_id' => $foreignProgram->id,
        'name' => 'September 2026',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['program_id']);
});

it('rejects an intake deadline after the start date', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();

    $this->postJson('/api/v1/intakes', [
        'university_id' => $university->id,
        'name' => 'September 2026',
        'start_date' => '2026-09-01',
        'application_deadline' => '2026-09-15',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['application_deadline']);
});

// ── Agreements (commission terms) ──────────────────────────────────────

it('creates a percent agreement within bounds', function () {
    actingAsStaffWith(['universities.manage.global']);
    $university = University::factory()->create();

    $this->postJson('/api/v1/agreements', [
        'university_id' => $university->id,
        'commission_type' => 'percent',
        'commission_value' => 15,
        'valid_from' => '2026-01-01',
        'valid_to' => '2027-01-01',
    ])
        ->assertCreated()
        ->assertJsonPath('data.commission_type', 'percent');
});

it('rejects percent commissions above 100', function () {
    actingAsStaffWith(['universities.manage.global']);
    $university = University::factory()->create();

    $this->postJson('/api/v1/agreements', [
        'university_id' => $university->id,
        'commission_type' => 'percent',
        'commission_value' => 130,
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['commission_value']);
});

it('requires a currency for fixed agreements', function () {
    actingAsStaffWith(['universities.manage.global']);
    $university = University::factory()->create();

    $this->postJson('/api/v1/agreements', [
        'university_id' => $university->id,
        'commission_type' => 'fixed',
        'commission_value' => 8000,
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['currency']);
});

it('rejects valid_to earlier than valid_from', function () {
    actingAsStaffWith(['universities.manage.global']);
    $university = University::factory()->create();

    $this->postJson('/api/v1/agreements', [
        'university_id' => $university->id,
        'commission_type' => 'percent',
        'commission_value' => 10,
        'valid_from' => '2027-01-01',
        'valid_to' => '2026-01-01',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['valid_to']);
});

it('lets commission viewers read agreements but not mutate them', function () {
    actingAsStaffWith(['commission.view.global']);
    UniversityAgreement::factory()->create();

    $this->getJson('/api/v1/agreements')->assertOk()->assertJsonCount(1, 'data');

    $this->postJson('/api/v1/agreements', [
        'university_id' => UniversityAgreement::first()->university_id,
        'commission_type' => 'percent',
        'commission_value' => 10,
    ])->assertStatus(403);
});

it('hides agreements from plain catalog viewers', function () {
    actingAsStaffWith(['universities.view.global']);

    $this->getJson('/api/v1/agreements')->assertStatus(403);
});

// ── Scholarships & contacts ────────────────────────────────────────────

it('manages scholarships behind the scholarships permissions', function () {
    actingAsStaffWith(['scholarships.view.global', 'scholarships.manage.global']);
    $university = University::factory()->create();

    $this->postJson('/api/v1/scholarships', [
        'university_id' => $university->id,
        'name' => 'Presidential Scholarship',
        'type' => 'full',
    ])->assertCreated();

    $this->getJson('/api/v1/scholarships')->assertOk()->assertJsonCount(1, 'data');
});

it('manages university contacts through the nested routes', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();

    $contactId = $this->postJson("/api/v1/universities/{$university->id}/contacts", [
        'name' => 'Ms. Li Wei',
        'email' => 'liwei@university.edu.cn',
        'role' => 'International Office',
    ])->assertCreated()->json('data.id');

    $this->getJson("/api/v1/universities/{$university->id}/contacts")
        ->assertOk()
        ->assertJsonCount(1, 'data');

    $this->patchJson("/api/v1/contacts/{$contactId}", ['role' => 'Admissions Officer'])
        ->assertOk()
        ->assertJsonPath('data.role', 'Admissions Officer');

    $this->deleteJson("/api/v1/contacts/{$contactId}")->assertNoContent();
});

<?php

use App\Models\Application;
use App\Models\DocumentType;
use App\Models\Program;
use App\Models\Scholarship;
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

it('soft deletes a program with no applications', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();
    $program = Program::factory()->for($university)->create();

    $this->deleteJson("/api/v1/programs/{$program->id}")->assertNoContent();

    expect($program->fresh()->trashed())->toBeTrue();
});

it('refuses to delete a program that has applications', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();
    $program = Program::factory()->for($university)->create();
    Application::factory()->create(['university_id' => $university->id, 'program_id' => $program->id]);

    $this->deleteJson("/api/v1/programs/{$program->id}")->assertStatus(409);

    expect($program->fresh()->trashed())->toBeFalse();
});

it('forbids viewers from deleting a program', function () {
    actingAsStaffWith(['universities.view.global']);
    $program = Program::factory()->create();

    $this->deleteJson("/api/v1/programs/{$program->id}")->assertStatus(403);
});

it('refuses to delete a scholarship that has applications', function () {
    actingAsStaffWith(['scholarships.view.global', 'scholarships.manage.global']);
    $university = University::factory()->create();
    $scholarship = Scholarship::factory()->create(['university_id' => $university->id]);
    Application::factory()->create(['university_id' => $university->id, 'scholarship_id' => $scholarship->id]);

    $this->deleteJson("/api/v1/scholarships/{$scholarship->id}")->assertStatus(409);
});

it('soft deletes a scholarship with no applications', function () {
    actingAsStaffWith(['scholarships.view.global', 'scholarships.manage.global']);
    $scholarship = Scholarship::factory()->create();

    $this->deleteJson("/api/v1/scholarships/{$scholarship->id}")->assertNoContent();

    expect($scholarship->fresh()->trashed())->toBeTrue();
});

it('stores the per-course service-charge matrix', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();

    $scholarship = Scholarship::factory()->create(['university_id' => $university->id]);
    $charges = [
        'currency' => 'USD',
        'self' => ['student' => 400, 'agent' => 200],
        'scholarships' => [['scholarship_id' => $scholarship->id, 'student' => 300, 'agent' => 150]],
    ];

    $response = $this->postJson('/api/v1/programs', [
        'university_id' => $university->id,
        'name' => 'MBBS',
        'level' => 'bachelor',
        'service_charges' => $charges,
    ])
        ->assertCreated()
        ->assertJsonPath('data.service_charges.self.student', 400)
        ->assertJsonPath('data.service_charges.scholarships.0.scholarship_id', $scholarship->id)
        ->assertJsonPath('data.service_charges.scholarships.0.agent', 150);

    $program = Program::findOrFail($response->json('data.id'));
    expect($program->service_charges['currency'])->toBe('USD')
        ->and($program->service_charges['scholarships'][0]['student'])->toBe(300);
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

it('links selected scholarships to a program', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();
    $a = Scholarship::factory()->create(['university_id' => $university->id]);
    $b = Scholarship::factory()->create(['university_id' => $university->id]);
    $c = Scholarship::factory()->create(['university_id' => $university->id]);

    $response = $this->postJson('/api/v1/programs', [
        'university_id' => $university->id,
        'name' => 'MBBS',
        'level' => 'bachelor',
        'scholarship_ids' => [$a->id, $c->id],
    ])
        ->assertCreated()
        ->assertJsonPath('data.scholarship_ids', [$a->id, $c->id]);

    $program = Program::findOrFail($response->json('data.id'));
    expect($program->scholarships()->pluck('scholarships.id')->sort()->values()->all())
        ->toBe([$a->id, $c->id]);

    // Updating replaces the set.
    $this->patchJson("/api/v1/programs/{$program->id}", ['scholarship_ids' => [$b->id]])
        ->assertOk()
        ->assertJsonPath('data.scholarship_ids', [$b->id]);
    expect($program->scholarships()->pluck('scholarships.id')->all())->toBe([$b->id]);
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
        'tuition_after' => 0,
        'hostel_after' => 2000,
        'stipend_monthly' => 800,
    ])
        ->assertCreated()
        ->assertJsonPath('data.tuition_after', '0.00')
        ->assertJsonPath('data.stipend_monthly', '800.00');

    $this->getJson('/api/v1/scholarships')->assertOk()->assertJsonCount(1, 'data');
});

it('creates a government scholarship with universities and per-level benefits', function () {
    actingAsStaffWith(['scholarships.view.global', 'scholarships.manage.global']);
    $u1 = University::factory()->create();
    $u2 = University::factory()->create();

    $this->postJson('/api/v1/scholarships', [
        'scope' => 'government',
        'name' => 'Chinese Government Scholarship (CSC)',
        'type' => 'full',
        'university_ids' => [$u1->id, $u2->id],
        'benefits' => [
            'bachelor' => ['tuition_after' => 0, 'stipend_monthly' => 2500],
            'phd' => ['stipend_monthly' => 3500],
        ],
    ])
        ->assertCreated()
        ->assertJsonPath('data.scope', 'government')
        ->assertJsonPath('data.university_id', null)
        ->assertJsonPath('data.university_ids', [$u1->id, $u2->id])
        ->assertJsonPath('data.benefits.bachelor.stipend_monthly', 2500)
        ->assertJsonPath('data.benefits.phd.stipend_monthly', 3500);

    $this->getJson('/api/v1/scholarships?filter[scope]=government')
        ->assertOk()->assertJsonCount(1, 'data');
});

it('requires a university for an internal scholarship', function () {
    actingAsStaffWith(['scholarships.view.global', 'scholarships.manage.global']);

    $this->postJson('/api/v1/scholarships', ['name' => 'Internal Award'])
        ->assertStatus(422)->assertJsonValidationErrors('university_id');
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

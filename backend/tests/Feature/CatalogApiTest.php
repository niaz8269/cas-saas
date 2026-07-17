<?php

use App\Models\Course;
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
        ->assertJsonStructure(['data' => [['id', 'name', 'code', 'status', 'courses_count']], 'meta']);
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

// ── Courses & intakes ───────────────────────────────────────────────────

it('creates a course under a university', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();

    $this->postJson('/api/v1/courses', [
        'university_id' => $university->id,
        'name' => 'MBBS',
        'level' => 'bachelor',
        'duration_months' => 72,
        'tuition_fee' => 30000,
        'currency' => 'CNY',
    ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'MBBS');
});

it('rejects an intake whose course belongs to another university', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $university = University::factory()->create();
    $foreignCourse = Course::factory()->create(); // different university

    $this->postJson('/api/v1/intakes', [
        'university_id' => $university->id,
        'course_id' => $foreignCourse->id,
        'name' => 'September 2026',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['course_id']);
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

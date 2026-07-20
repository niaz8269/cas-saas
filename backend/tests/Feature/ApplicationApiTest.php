<?php

use App\Models\Application;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Program;
use App\Models\Student;
use App\Models\University;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

const ADMISSIONS_PERMS = ['applications.view.global', 'applications.create.global', 'applications.update.global'];
const APP_COUNSELOR_PERMS = ['applications.view.assigned'];

it('creates an application with code, history and timeline entry', function () {
    $user = actingAsStaffWith(ADMISSIONS_PERMS);
    $university = University::factory()->create();
    $program = Program::factory()->for($university)->create();
    $student = Student::factory()->create();

    $response = $this->postJson('/api/v1/applications', [
        'student_id' => $student->id,
        'university_id' => $university->id,
        'program_id' => $program->id,
    ])->assertCreated();

    expect($response->json('data.application_code'))->toMatch('/^APP-\d{4}-\d{5}$/')
        ->and($response->json('data.status'))->toBe('draft');

    $application = Application::findOrFail($response->json('data.id'));
    expect($application->statusHistory)->toHaveCount(1)
        ->and($application->statusHistory->first()->to_status)->toBe('draft')
        ->and($student->activities()->where('type', 'system')->exists())->toBeTrue();
});

it('rejects a program from a different university', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    $university = University::factory()->create();
    $foreignProgram = Program::factory()->create();
    $student = Student::factory()->create();

    $this->postJson('/api/v1/applications', [
        'student_id' => $student->id,
        'university_id' => $university->id,
        'program_id' => $foreignProgram->id,
    ])->assertStatus(422)->assertJsonValidationErrors(['program_id']);
});

it('scopes counselors to their students applications', function () {
    $counselor = actingAsStaffWith(APP_COUNSELOR_PERMS);
    $myStudent = Student::factory()->create(['assigned_counselor_id' => $counselor->id]);
    $mine = Application::factory()->create(['student_id' => $myStudent->id]);
    Application::factory()->count(2)->create();

    $response = $this->getJson('/api/v1/applications')->assertOk();

    expect($response->json('meta.total'))->toBe(1)
        ->and($response->json('data.0.id'))->toBe($mine->id);
});

it('filters applications awaiting verification', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    $toVerify = Application::factory()->create(['review' => true]);
    Application::factory()->count(2)->create(['review' => false]);

    $response = $this->getJson('/api/v1/applications?filter[review]=1')->assertOk();

    expect($response->json('meta.total'))->toBe(1)
        ->and($response->json('data.0.id'))->toBe($toVerify->id)
        ->and($response->json('data.0.review'))->toBeTrue();
});

it('exposes the full applicant profile on the detail endpoint', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    $student = Student::factory()->create([
        'chinese_name' => '黄佳佳', 'native_language' => 'Urdu', 'passport_no' => 'UD5164361',
    ]);
    $student->guardians()->create(['name' => 'Arfa', 'relation' => 'Parent', 'phone' => '0333']);
    $student->education()->create([
        'level' => 'Senior High School', 'major' => 'Pre medical',
        'institution' => 'Punjab Group', 'start_year' => 2022, 'end_year' => 2025,
    ]);
    $application = Application::factory()->create(['student_id' => $student->id]);

    $this->getJson("/api/v1/applications/{$application->id}")->assertOk()
        ->assertJsonPath('data.applicant.personal.chinese_name', '黄佳佳')
        ->assertJsonPath('data.applicant.personal.native_language', 'Urdu')
        ->assertJsonPath('data.applicant.passport.passport_no', 'UD5164361')
        ->assertJsonPath('data.applicant.guardians.0.name', 'Arfa')
        ->assertJsonPath('data.applicant.education.0.institution', 'Punjab Group');
});

it('omits the applicant profile from the list endpoint', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    Application::factory()->create();

    $this->getJson('/api/v1/applications')->assertOk()
        ->assertJsonMissingPath('data.0.applicant');
});

it('exports the filtered applications as CSV', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    $wanted = Application::factory()->create(['status' => 'under_review']);
    Application::factory()->create(['status' => 'draft']); // excluded by the filter

    $response = $this->get('/api/v1/applications/export?filter[status]=under_review');

    $response->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
    $csv = $response->streamedContent();

    expect($csv)->toContain('Code,Student')                 // header row
        ->and($csv)->toContain($wanted->application_code)   // matching row present
        ->and(substr_count($csv, "\n"))->toBe(2);           // header + one data row only
});

it('denies the applications export without view permission', function () {
    actingAsStaffWith([]);
    $this->get('/api/v1/applications/export')->assertStatus(403);
});

it('reassigns the admissions officer via update and returns it', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    $university = University::factory()->create();
    $application = Application::factory()->create(['university_id' => $university->id]);
    $officer = User::factory()->create();

    $this->patchJson("/api/v1/applications/{$application->id}", [
        'assigned_admissions_id' => $officer->id,
    ])
        ->assertOk()
        ->assertJsonPath('data.admissions_officer.id', $officer->id);

    expect($application->fresh()->assigned_admissions_id)->toBe($officer->id);
});

it('clears the admissions officer when reassigned to null', function () {
    $me = actingAsStaffWith(ADMISSIONS_PERMS);
    $university = University::factory()->create();
    $application = Application::factory()->create([
        'university_id' => $university->id,
        'assigned_admissions_id' => $me->id,
    ]);

    $this->patchJson("/api/v1/applications/{$application->id}", [
        'assigned_admissions_id' => null,
    ])->assertOk();

    expect($application->fresh()->assigned_admissions_id)->toBeNull();
});

it('performs a legal transition and writes immutable history', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    $application = Application::factory()->create();

    $this->postJson("/api/v1/applications/{$application->id}/transition", [
        'status' => 'under_review',
        'note' => 'Docs look promising',
    ])->assertOk()->assertJsonPath('data.status', 'under_review');

    expect($application->fresh()->statusHistory()->count())->toBe(1)
        ->and($application->fresh()->statusHistory()->first()->note)->toBe('Docs look promising');
});

it('rejects illegal transitions with 409', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    $application = Application::factory()->create(); // draft

    $this->postJson("/api/v1/applications/{$application->id}/transition", ['status' => 'accepted'])
        ->assertStatus(409)
        ->assertJsonPath('code', 'CONFLICT');
});

it('blocks submission while required documents are missing', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    DocumentType::factory()->requiredForApplication()->create(['name' => 'Passport']);
    DocumentType::factory()->requiredForApplication()->create(['name' => 'Transcript']);
    $application = Application::factory()->create(['status' => 'under_review']);

    $this->postJson("/api/v1/applications/{$application->id}/transition", ['status' => 'submitted'])
        ->assertStatus(409)
        ->assertJsonPath('code', 'CHECKLIST_INCOMPLETE')
        ->assertJsonCount(2, 'missing');
});

it('submits once the checklist is covered and stamps submitted_at', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    $passport = DocumentType::factory()->requiredForApplication()->create(['name' => 'Passport']);
    $application = Application::factory()->create(['status' => 'under_review']);

    Document::factory()->for($passport, 'type')->create([
        'documentable_type' => Application::class,
        'documentable_id' => $application->id,
    ]);

    $this->postJson("/api/v1/applications/{$application->id}/transition", ['status' => 'submitted'])
        ->assertOk()
        ->assertJsonPath('data.status', 'submitted');

    expect($application->fresh()->submitted_at)->not->toBeNull();
});

it('rejected documents do not satisfy the checklist', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    $passport = DocumentType::factory()->requiredForApplication()->create(['name' => 'Passport']);
    $application = Application::factory()->create(['status' => 'under_review']);

    Document::factory()->for($passport, 'type')->create([
        'documentable_type' => Application::class,
        'documentable_id' => $application->id,
        'status' => 'rejected',
    ]);

    $this->postJson("/api/v1/applications/{$application->id}/transition", ['status' => 'submitted'])
        ->assertStatus(409)
        ->assertJsonPath('code', 'CHECKLIST_INCOMPLETE');
});

it('records an offer and auto-advances submitted applications', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    $application = Application::factory()->create(['status' => 'submitted', 'submitted_at' => now()]);

    $this->postJson("/api/v1/applications/{$application->id}/offers", [
        'offer_type' => 'conditional',
        'reference_no' => 'OFR-2026-JLMU',
        'issued_date' => '2026-07-01',
        'expiry_date' => '2026-09-01',
    ])->assertCreated();

    expect($application->fresh()->status)->toBe('offer_received')
        ->and($application->fresh()->offers)->toHaveCount(1);
});

it('accepts from offer_received completing the history chain', function () {
    actingAsStaffWith(ADMISSIONS_PERMS);
    $application = Application::factory()->create(['status' => 'offer_received']);

    $this->postJson("/api/v1/applications/{$application->id}/transition", ['status' => 'accepted'])
        ->assertOk()
        ->assertJsonPath('data.status', 'accepted');

    // Terminal: nothing further allowed.
    $this->postJson("/api/v1/applications/{$application->id}/transition", ['status' => 'withdrawn'])
        ->assertStatus(409);
});

it('denies transitions to counselors with view-only access', function () {
    $counselor = actingAsStaffWith(APP_COUNSELOR_PERMS);
    $student = Student::factory()->create(['assigned_counselor_id' => $counselor->id]);
    $application = Application::factory()->create(['student_id' => $student->id]);

    $this->postJson("/api/v1/applications/{$application->id}/transition", ['status' => 'under_review'])
        ->assertStatus(403);
});

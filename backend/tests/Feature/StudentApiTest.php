<?php

use App\Models\Activity;
use App\Models\Branch;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

const STUDENT_COUNSELOR_PERMS = ['students.view.assigned', 'students.update.assigned'];
const STUDENT_ADMIN_PERMS = ['students.view.global', 'students.update.global'];

it('creates a student with a generated code for a creator', function () {
    actingAsStaffWith(['students.create.global', 'students.view.global']);

    $response = $this->postJson('/api/v1/students', [
        'first_name' => 'Mei', 'last_name' => 'Chen', 'email' => 'mei@example.com',
    ])->assertCreated();

    expect($response->json('data.full_name'))->toBe('Mei Chen')
        ->and($response->json('data.student_code'))->toMatch('/^STU-\d{4}-\d{5}$/')
        ->and($response->json('data.status'))->toBe('active');
    expect(Student::where('email', 'mei@example.com')->exists())->toBeTrue();
});

it('denies student creation without the create permission', function () {
    actingAsStaffWith(['students.view.global']);

    $this->postJson('/api/v1/students', ['first_name' => 'No', 'last_name' => 'Perm'])
        ->assertStatus(403);
});

it('validates required names on student creation', function () {
    actingAsStaffWith(['students.create.global']);

    $this->postJson('/api/v1/students', ['email' => 'x@example.com'])
        ->assertStatus(422)->assertJsonValidationErrors(['first_name', 'last_name']);
});

it('shows counselors only their assigned students', function () {
    $counselor = actingAsStaffWith(STUDENT_COUNSELOR_PERMS);
    $mine = Student::factory()->create(['assigned_counselor_id' => $counselor->id]);
    Student::factory()->count(2)->create();

    $response = $this->getJson('/api/v1/students')->assertOk();

    expect($response->json('meta.total'))->toBe(1)
        ->and($response->json('data.0.id'))->toBe($mine->id);
});

it('scopes branch viewers to their branch', function () {
    $viewer = actingAsStaffWith(['students.view.branch']);
    $viewer->update(['branch_id' => Branch::factory()->create()->id]);
    $viewer->refresh();

    Student::factory()->create(['branch_id' => $viewer->branch_id]);
    Student::factory()->create(['branch_id' => Branch::factory()->create()->id]);

    $this->getJson('/api/v1/students')->assertOk()->assertJsonPath('meta.total', 1);
});

it('searches by student code and passport', function () {
    actingAsStaffWith(STUDENT_ADMIN_PERMS);
    Student::factory()->create(['student_code' => 'STU-2026-00042', 'passport_no' => 'AB1234567']);
    Student::factory()->count(2)->create();

    $this->getJson('/api/v1/students?q=STU-2026-00042')->assertOk()->assertJsonPath('meta.total', 1);
    $this->getJson('/api/v1/students?q=AB1234567')->assertOk()->assertJsonPath('meta.total', 1);
});

it('appends notes to the timeline and reads them back', function () {
    $counselor = actingAsStaffWith(STUDENT_COUNSELOR_PERMS);
    $student = Student::factory()->create(['assigned_counselor_id' => $counselor->id]);
    Activity::factory()->for($student)->create(['type' => 'system', 'body' => 'Converted from lead #9']);

    $this->postJson("/api/v1/students/{$student->id}/notes", ['body' => 'Called the family, docs next week.'])
        ->assertCreated()
        ->assertJsonPath('data.type', 'note');

    $timeline = $this->getJson("/api/v1/students/{$student->id}/timeline")->assertOk();

    expect($timeline->json('meta.total'))->toBe(2)
        ->and(collect($timeline->json('data'))->pluck('type'))->toContain('note', 'system');
});

it('blocks counselors from other students', function () {
    actingAsStaffWith(STUDENT_COUNSELOR_PERMS);
    $other = Student::factory()->create();

    $this->getJson("/api/v1/students/{$other->id}")->assertStatus(403);
    $this->postJson("/api/v1/students/{$other->id}/notes", ['body' => 'nope'])->assertStatus(403);
});

it('lets admins update any student and stamps updated_by', function () {
    $admin = actingAsStaffWith(STUDENT_ADMIN_PERMS);
    $student = Student::factory()->create();

    $this->patchJson("/api/v1/students/{$student->id}", ['status' => 'in_process'])
        ->assertOk()
        ->assertJsonPath('data.status', 'in_process');

    expect($student->fresh()->updated_by)->toBe($admin->id);
});

it('reassigns a student to another counselor and returns it', function () {
    actingAsStaffWith(STUDENT_ADMIN_PERMS);
    $student = Student::factory()->create();
    $counselor = User::factory()->create();

    $this->patchJson("/api/v1/students/{$student->id}", [
        'assigned_counselor_id' => $counselor->id,
    ])
        ->assertOk()
        ->assertJsonPath('data.counselor.id', $counselor->id);

    expect($student->fresh()->assigned_counselor_id)->toBe($counselor->id);
});

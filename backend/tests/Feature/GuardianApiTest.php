<?php

use App\Models\Student;
use App\Models\StudentGuardian;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('denies adding a guardian without update scope', function () {
    actingAsStaffWith(['students.view.global']); // view only
    $student = Student::factory()->create();

    $this->postJson("/api/v1/students/{$student->id}/guardians", ['name' => 'Jane Doe'])
        ->assertForbidden();
});

it('adds a guardian to a student', function () {
    actingAsStaffWith(['students.update.global']);
    $student = Student::factory()->create();

    $this->postJson("/api/v1/students/{$student->id}/guardians", [
        'name' => 'Jane Doe', 'relation' => 'Mother', 'phone' => '+92 300 1234567', 'email' => 'jane@example.com',
    ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Jane Doe')
        ->assertJsonPath('data.relation', 'Mother');

    expect($student->guardians()->count())->toBe(1);
});

it('validates the guardian name', function () {
    actingAsStaffWith(['students.update.global']);
    $student = Student::factory()->create();

    $this->postJson("/api/v1/students/{$student->id}/guardians", ['relation' => 'Mother'])
        ->assertStatus(422)
        ->assertJsonPath('code', 'VALIDATION_ERROR');
});

it('updates a guardian and 404s across students', function () {
    actingAsStaffWith(['students.update.global']);
    $student = Student::factory()->create();
    $guardian = StudentGuardian::factory()->for($student)->create(['name' => 'Old Name']);
    $foreign = StudentGuardian::factory()->for(Student::factory())->create();

    $this->patchJson("/api/v1/students/{$student->id}/guardians/{$guardian->id}", ['name' => 'New Name'])
        ->assertOk()
        ->assertJsonPath('data.name', 'New Name');

    $this->patchJson("/api/v1/students/{$student->id}/guardians/{$foreign->id}", ['name' => 'Hack'])
        ->assertNotFound();
});

it('removes a guardian', function () {
    actingAsStaffWith(['students.update.global']);
    $student = Student::factory()->create();
    $guardian = StudentGuardian::factory()->for($student)->create();

    $this->deleteJson("/api/v1/students/{$student->id}/guardians/{$guardian->id}")
        ->assertOk();

    expect(StudentGuardian::find($guardian->id))->toBeNull();
});

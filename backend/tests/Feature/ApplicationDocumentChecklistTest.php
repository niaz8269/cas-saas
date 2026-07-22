<?php

use App\Models\Application;
use App\Models\DocumentType;
use App\Models\Notification;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

/*
 * The applicant wizard, the submit-check, and the admin checklist must all
 * resolve the SAME required-document set: the global baseline (document types
 * flagged required_for 'application') merged with any course-specific docs.
 * programRequiringPassport() + draftPayload() live in StudentApplicationSubmitTest.
 */

it('merges the required_for baseline with course documents for the applicant', function () {
    actingAsStudentPortal();
    DocumentType::factory()->create(['name' => 'School Leaving Certificate', 'required_for' => ['application']]);
    $rec = DocumentType::factory()->create(['name' => 'Recommendation Letter', 'required_for' => null]);
    $program = Program::factory()->create(['status' => 'active', 'requirements' => ['documents' => [$rec->id]]]);

    $names = collect($this->getJson("/api/v1/student/applications/required-documents?program_id={$program->id}")
        ->assertOk()->json('data'))->pluck('name');

    expect($names)->toContain('School Leaving Certificate')  // global baseline
        ->and($names)->toContain('Recommendation Letter');   // course extra
});

it('gives the admin checklist the same required set the applicant saw', function () {
    actingAsStaffWith(['applications.view.global']);
    DocumentType::factory()->create(['name' => 'School Leaving Certificate', 'required_for' => ['application']]);
    $rec = DocumentType::factory()->create(['name' => 'Recommendation Letter', 'required_for' => null]);
    $program = Program::factory()->create(['status' => 'active', 'requirements' => ['documents' => [$rec->id]]]);
    $application = Application::factory()->create([
        'program_id' => $program->id,
        'university_id' => $program->university_id,
    ]);

    $names = collect($this->getJson("/api/v1/applications/{$application->id}")
        ->assertOk()->json('checklist.required'))->pluck('name');

    expect($names)->toContain('School Leaving Certificate')
        ->and($names)->toContain('Recommendation Letter');
});

it('notifies management when an application is submitted', function () {
    Role::findOrCreate('Management', 'staff');
    $manager = User::factory()->create();
    $manager->assignRole('Management');

    [$program, $passport] = programRequiringPassport();
    $student = actingAsStudentPortal();
    $id = $this->postJson('/api/v1/student/applications', draftPayload($program))->json('data.id');

    $this->postJson("/api/v1/student/applications/{$id}/documents", [
        'document_type_id' => $passport->id,
        'key' => "students/{$student->id}/applications/{$id}/passport.jpg",
        'file_name' => 'passport.jpg', 'mime' => 'image/jpeg', 'size' => 1000,
    ])->assertCreated();

    $this->postJson("/api/v1/student/applications/{$id}/submit")->assertOk();

    expect(Notification::where('user_id', $manager->id)
        ->where('entity_type', 'application')
        ->where('entity_id', $id)
        ->exists())->toBeTrue();
});

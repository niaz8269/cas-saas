<?php

use App\Models\Application;
use App\Models\DocumentType;
use App\Models\Notification;
use App\Models\Program;
use App\Models\Student;
use App\Models\University;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

/** A program whose only required document is Passport, for a tight gate. */
function programRequiringPassport(): array
{
    $passport = DocumentType::factory()->create(['name' => 'Passport']);
    $uni = University::factory()->create(['status' => 'active']);
    $program = Program::factory()->create([
        'university_id' => $uni->id,
        'name' => 'MBBS',
        'level' => 'bachelor',
        'status' => 'active',
        'requirements' => ['documents' => [$passport->id]],
    ]);

    return [$program, $passport];
}

function draftPayload(Program $program): array
{
    return [
        'program_id' => $program->id,
        'funding' => 'self',
        'profile' => [
            'phone' => '+92 300 1234567',
            'passport_no' => 'AB1234567',
            'city' => 'Lahore',
            'place_of_birth' => 'Lahore',
        ],
        'guardians' => [
            ['relation' => 'father', 'name' => 'Ali Khan', 'occupation' => 'Engineer', 'phone' => '+92 300 7654321'],
            ['relation' => 'mother', 'name' => 'Sara Khan'],
        ],
        'education' => [
            ['level' => 'intermediate', 'degree_name' => 'FSc Pre-Medical', 'institution' => 'Govt College',
                'end_year' => 2024, 'grade_type' => 'percentage', 'grade_value' => '88%'],
        ],
    ];
}

it('requires the student guard to create an application', function () {
    [$program] = programRequiringPassport();

    $this->postJson('/api/v1/student/applications', draftPayload($program))
        ->assertUnauthorized();
});

it('creates a draft and persists the applicant profile, guardians and education', function () {
    [$program, $passport] = programRequiringPassport();
    $student = actingAsStudentPortal();

    $response = $this->postJson('/api/v1/student/applications', draftPayload($program))
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.required_documents.0.name', 'Passport');

    $application = Application::firstOrFail();
    expect($application->student_id)->toBe($student->id)
        ->and($application->program_id)->toBe($program->id)
        ->and($application->university_id)->toBe($program->university_id)
        ->and($application->scholarship_id)->toBeNull();

    $student->refresh();
    expect($student->city)->toBe('Lahore')
        ->and($student->passport_no)->toBe('AB1234567')
        ->and($student->guardians)->toHaveCount(2)
        ->and($student->education)->toHaveCount(1);
    expect($student->guardians->firstWhere('relation', 'father')->occupation)->toBe('Engineer');

    // draft is recorded in the immutable history
    expect($application->statusHistory()->where('to_status', 'draft')->exists())->toBeTrue();
});

it('blocks submission until every required document is attached', function () {
    [$program] = programRequiringPassport();
    actingAsStudentPortal();

    $create = $this->postJson('/api/v1/student/applications', draftPayload($program))->assertCreated();
    $id = $create->json('data.id');

    $this->postJson("/api/v1/student/applications/{$id}/submit")
        ->assertStatus(422)
        ->assertJsonValidationErrors('documents');

    expect(Application::find($id)->status)->toBe('draft');
});

it('accepts only JPG documents on the draft', function () {
    [$program, $passport] = programRequiringPassport();
    $student = actingAsStudentPortal();
    $id = $this->postJson('/api/v1/student/applications', draftPayload($program))->json('data.id');
    $key = "students/{$student->id}/applications/{$id}/scan.jpg";

    // A PDF is rejected.
    $this->postJson("/api/v1/student/applications/{$id}/documents", [
        'document_type_id' => $passport->id,
        'key' => $key,
        'file_name' => 'passport.pdf',
        'mime' => 'application/pdf',
        'size' => 1000,
    ])->assertStatus(422)->assertJsonValidationErrors('mime');

    // A JPG is accepted and attaches to the application.
    $this->postJson("/api/v1/student/applications/{$id}/documents", [
        'document_type_id' => $passport->id,
        'key' => $key,
        'file_name' => 'passport.jpg',
        'mime' => 'image/jpeg',
        'size' => 1000,
    ])->assertCreated();

    $application = Application::find($id);
    expect($application->documents()->count())->toBe(1);
});

it('submits the draft to CAS once documents are complete', function () {
    [$program, $passport] = programRequiringPassport();
    $student = actingAsStudentPortal();
    $id = $this->postJson('/api/v1/student/applications', draftPayload($program))->json('data.id');

    $this->postJson("/api/v1/student/applications/{$id}/documents", [
        'document_type_id' => $passport->id,
        'key' => "students/{$student->id}/applications/{$id}/passport.jpg",
        'file_name' => 'passport.jpg',
        'mime' => 'image/jpeg',
        'size' => 1000,
    ])->assertCreated();

    $this->postJson("/api/v1/student/applications/{$id}/submit")
        ->assertOk()
        ->assertJsonPath('data.status', 'under_review');

    $application = Application::find($id);
    expect($application->status)->toBe('under_review')
        ->and($application->statusHistory()->where('to_status', 'under_review')->exists())->toBeTrue();
});

it('routes a submitted application to an admissions officer and notifies them', function () {
    Role::findOrCreate('Admissions', 'staff');
    $officer = User::factory()->create();
    $officer->assignRole('Admissions');

    [$program, $passport] = programRequiringPassport();
    $student = actingAsStudentPortal();
    $id = $this->postJson('/api/v1/student/applications', draftPayload($program))->json('data.id');

    $this->postJson("/api/v1/student/applications/{$id}/documents", [
        'document_type_id' => $passport->id,
        'key' => "students/{$student->id}/applications/{$id}/passport.jpg",
        'file_name' => 'passport.jpg',
        'mime' => 'image/jpeg',
        'size' => 1000,
    ])->assertCreated();

    $this->postJson("/api/v1/student/applications/{$id}/submit")->assertOk();

    $application = Application::find($id);
    expect($application->status)->toBe('under_review')
        ->and($application->assigned_admissions_id)->toBe($officer->id);

    expect(Notification::where('user_id', $officer->id)
        ->where('entity_type', 'application')
        ->where('entity_id', $id)
        ->exists())->toBeTrue();
});

it('never touches another students application', function () {
    [$program] = programRequiringPassport();
    $mine = actingAsStudentPortal();
    $theirs = Application::factory()->create([
        'student_id' => Student::factory()->create()->id,
        'status' => 'draft',
    ]);

    $this->postJson("/api/v1/student/applications/{$theirs->id}/submit")->assertNotFound();
});

<?php

use App\Models\Agent;
use App\Models\Application;
use App\Models\Program;
use App\Models\Student;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function trackProgram(string $name = 'Civil Engineering', string $level = 'master'): Program
{
    return Program::factory()->create([
        'university_id' => University::factory()->create(['status' => 'active'])->id,
        'name' => $name, 'level' => $level, 'status' => 'active',
    ]);
}

function trackPayload(Program $program, array $extra = []): array
{
    return [
        'program_id' => $program->id,
        'funding' => 'self',
        'profile' => [
            'phone' => '+92 300 1234567', 'passport_no' => 'AB1234567', 'city' => 'Lahore', 'place_of_birth' => 'Lahore',
            'english_test' => 'IELTS', 'english_test_score' => '6.5', 'english_test_date' => '2025-03-01',
        ],
        'guardians' => [['relation' => 'father', 'name' => 'Ali Khan', 'phone' => '+92 300 7654321']],
        'education' => [['level' => 'intermediate', 'degree_name' => 'FSc', 'institution' => 'Govt College', 'end_year' => 2024, 'grade_type' => 'percentage', 'grade_value' => '88%']],
        ...$extra,
    ];
}

it('picks an unfinished draft up again instead of starting a second application for the same program', function () {
    $student = actingAsStudentPortal();
    $program = trackProgram();

    $first = $this->postJson('/api/v1/student/applications', trackPayload($program))->assertCreated()->assertJsonPath('data.resumed', false);
    $again = $this->postJson('/api/v1/student/applications', trackPayload($program))->assertOk()->assertJsonPath('data.resumed', true);

    expect($again->json('data.id'))->toBe($first->json('data.id'))
        ->and(Application::where('student_id', $student->id)->count())->toBe(1);
});

it('explains an application already in progress for that program instead of doubling it', function () {
    $student = actingAsStudentPortal();
    $program = trackProgram();
    $id = $this->postJson('/api/v1/student/applications', trackPayload($program))->json('data.id');
    $application = Application::findOrFail($id);
    $application->forceFill(['status' => 'under_review'])->save();

    $this->postJson('/api/v1/student/applications', trackPayload($program))
        ->assertStatus(422)
        ->assertJsonValidationErrors('program_id')
        ->assertJsonPath('errors.program_id.0', fn ($m) => str_contains($m, $application->application_code) && str_contains($m, 'under review'));

    expect(Application::where('student_id', $student->id)->count())->toBe(1);
});

it('lets a student apply to many programs, and to one again after it was rejected', function () {
    $student = actingAsStudentPortal();
    $a = trackProgram('Civil Engineering');
    $b = trackProgram('Clinical Medicine');

    $firstId = $this->postJson('/api/v1/student/applications', trackPayload($a))->assertCreated()->json('data.id');
    $this->postJson('/api/v1/student/applications', trackPayload($b))->assertCreated();
    expect(Application::where('student_id', $student->id)->count())->toBe(2);

    Application::findOrFail($firstId)->forceFill(['status' => 'rejected'])->save();
    $this->postJson('/api/v1/student/applications', trackPayload($a))->assertCreated();

    expect(Application::where('student_id', $student->id)->count())->toBe(3);
});

it('gives back everything needed to carry on with a saved draft', function () {
    actingAsStudentPortal();
    $program = trackProgram('MBBS', 'bachelor');
    $id = $this->postJson('/api/v1/student/applications', trackPayload($program))->json('data.id');

    $this->getJson("/api/v1/student/applications/{$id}/draft")
        ->assertOk()
        ->assertJsonPath('data.id', $id)
        ->assertJsonPath('data.degree', 'mbbs')
        ->assertJsonPath('data.funding', 'self')
        ->assertJsonPath('data.program.id', $program->id)
        ->assertJsonPath('data.program.university.id', $program->university_id)
        ->assertJsonStructure(['data' => ['required_documents', 'optional_documents', 'custom_fields', 'intake_id']]);
});

it('keeps a draft private to its owner and out of reach once submitted', function () {
    actingAsStudentPortal();
    $program = trackProgram();
    $other = Application::factory()->create(['student_id' => Student::factory()->create()->id, 'program_id' => $program->id, 'status' => 'draft']);

    $this->getJson("/api/v1/student/applications/{$other->id}/draft")->assertNotFound();

    $mine = $this->postJson('/api/v1/student/applications', trackPayload($program))->json('data.id');
    Application::findOrFail($mine)->forceFill(['status' => 'under_review'])->save();
    $this->getJson("/api/v1/student/applications/{$mine}/draft")->assertStatus(409);
});

it('lets a partner pick a student draft up again and track every application with its history', function () {
    $agent = actingAsAgent();
    $student = Student::factory()->create(['agent_id' => $agent->id]);
    $program = trackProgram();

    $first = $this->postJson('/api/v1/agent/applications', trackPayload($program, ['student_id' => $student->id]))->assertCreated();
    $again = $this->postJson('/api/v1/agent/applications', trackPayload($program, ['student_id' => $student->id]))->assertOk();
    expect($again->json('data.id'))->toBe($first->json('data.id'));

    $this->postJson('/api/v1/agent/applications', trackPayload(trackProgram('Law'), ['student_id' => $student->id]))->assertCreated();

    $list = $this->getJson("/api/v1/agent/applications?filter[student_id]={$student->id}")->assertOk();
    expect($list->json('data'))->toHaveCount(2)
        ->and($list->json('data.0.progress.0.status'))->toBe('draft');

    $stranger = Student::factory()->create(['agent_id' => Agent::factory()->create()->id]);
    $this->getJson("/api/v1/agent/applications?filter[student_id]={$stranger->id}")->assertOk()->assertJsonCount(0, 'data');
});

it('gives a student their own saved applicant record so a new application starts pre-filled', function () {
    $student = actingAsStudentPortal();
    $this->postJson('/api/v1/student/applications', trackPayload(trackProgram()))->assertCreated();

    $this->getJson('/api/v1/student/applicant')
        ->assertOk()
        ->assertJsonPath('data.id', $student->id)
        ->assertJsonPath('data.profile.passport_no', 'AB1234567')
        ->assertJsonPath('data.guardians.0.name', 'Ali Khan')
        ->assertJsonPath('data.education.0.degree_name', 'FSc');
});

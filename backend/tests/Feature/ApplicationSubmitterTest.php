<?php

use App\Models\Agent;
use App\Models\Application;
use App\Models\Program;
use App\Models\Student;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function submitterProgram(): Program
{
    return Program::factory()->create([
        'university_id' => University::factory()->create(['status' => 'active'])->id,
        'level' => 'master', 'status' => 'active',
    ]);
}

function submitterPayload(Program $program, array $extra = []): array
{
    return [
        'program_id' => $program->id,
        'funding' => 'self',
        'profile' => ['phone' => '+92 300 1234567', 'passport_no' => 'AB1234567', 'city' => 'Lahore', 'place_of_birth' => 'Lahore', 'english_test' => 'IELTS', 'english_test_score' => '6.5', 'english_test_date' => '2025-03-01'],
        'guardians' => [['relation' => 'father', 'name' => 'Ali Khan', 'phone' => '+92 300 7654321']],
        'education' => [['level' => 'intermediate', 'degree_name' => 'FSc', 'institution' => 'Govt College', 'end_year' => 2024, 'grade_type' => 'percentage', 'grade_value' => '88%']],
        ...$extra,
    ];
}

it('records that a student applied for themselves, even when they belong to a partner', function () {
    $agent = Agent::factory()->create();
    $student = actingAsStudentPortal(['agent_id' => $agent->id]);

    $id = $this->postJson('/api/v1/student/applications', submitterPayload(submitterProgram()))->assertCreated()->json('data.id');

    $application = Application::findOrFail($id);
    expect($application->submitted_via)->toBe('student')->and($application->agent_id)->toBe($agent->id)->and($application->student_id)->toBe($student->id);
});

it('records that a partner applied on the students behalf', function () {
    $agent = actingAsAgent();
    $student = Student::factory()->create(['agent_id' => $agent->id]);

    $id = $this->postJson('/api/v1/agent/applications', submitterPayload(submitterProgram(), ['student_id' => $student->id]))->assertCreated()->json('data.id');

    expect(Application::findOrFail($id)->submitted_via)->toBe('agent');
});

it('records that staff entered an application in the admin panel', function () {
    actingAsStaffWith(['applications.view.global', 'applications.create.global']);
    $program = submitterProgram();
    $student = Student::factory()->create();

    $id = $this->postJson('/api/v1/applications', ['student_id' => $student->id, 'university_id' => $program->university_id, 'program_id' => $program->id])
        ->assertCreated()->assertJsonPath('data.submitted_via', 'staff')->json('data.id');

    expect(Application::findOrFail($id)->submitted_via)->toBe('staff');
});

it('shows staff who submitted each application and which partner it belongs to', function () {
    actingAsStaffWith(['applications.view.global']);
    $agent = Agent::factory()->create(['name' => 'Bright Future']);
    $mine = Student::factory()->create(['agent_id' => $agent->id]);
    Application::factory()->create(['student_id' => $mine->id, 'agent_id' => $agent->id, 'submitted_via' => 'agent']);

    $row = $this->getJson('/api/v1/applications')->assertOk()->json('data.0');

    expect($row['submitted_via'])->toBe('agent')->and($row['agent']['name'])->toBe('Bright Future')->and($row['agent']['agent_code'])->toBe($agent->agent_code);
});

it('filters by who submitted, including applications whose submitter was not recorded', function () {
    actingAsStaffWith(['applications.view.global']);
    Application::factory()->create(['submitted_via' => 'student']);
    Application::factory()->count(2)->create(['submitted_via' => 'agent']);
    Application::factory()->create(['submitted_via' => 'staff']);
    Application::factory()->create(['submitted_via' => null]);

    expect($this->getJson('/api/v1/applications?filter[submitted_via]=agent')->json('data'))->toHaveCount(2)
        ->and($this->getJson('/api/v1/applications?filter[submitted_via]=student')->json('data'))->toHaveCount(1)
        ->and($this->getJson('/api/v1/applications?filter[submitted_via]=staff')->json('data'))->toHaveCount(1)
        ->and($this->getJson('/api/v1/applications?filter[submitted_via]=unknown')->json('data'))->toHaveCount(1)
        ->and($this->getJson('/api/v1/applications')->json('data'))->toHaveCount(5);
});

it('opens all of one partners students applications together, not only the ones it submitted itself', function () {
    actingAsStaffWith(['applications.view.global']);
    $agent = Agent::factory()->create();
    $other = Agent::factory()->create();
    $a = Student::factory()->create(['agent_id' => $agent->id]);
    $b = Student::factory()->create(['agent_id' => $agent->id]);
    $stranger = Student::factory()->create(['agent_id' => $other->id]);

    Application::factory()->create(['student_id' => $a->id, 'agent_id' => $agent->id, 'submitted_via' => 'agent']);
    Application::factory()->create(['student_id' => $a->id, 'agent_id' => $agent->id, 'submitted_via' => 'student']);
    Application::factory()->create(['student_id' => $b->id, 'agent_id' => null, 'submitted_via' => null]); // student of the partner, no partner on the row
    Application::factory()->create(['student_id' => $stranger->id, 'agent_id' => $other->id, 'submitted_via' => 'agent']);

    $rows = $this->getJson("/api/v1/applications?filter[agent_id]={$agent->id}")->assertOk()->json('data');

    expect($rows)->toHaveCount(3)
        ->and(collect($rows)->pluck('student.id')->unique()->sort()->values()->all())->toBe(collect([$a->id, $b->id])->sort()->values()->all());
});

it('puts who submitted into the export', function () {
    actingAsStaffWith(['applications.view.global']);
    $agent = Agent::factory()->create(['name' => 'Bright Future']);
    Application::factory()->create(['agent_id' => $agent->id, 'submitted_via' => 'agent']);

    $csv = $this->get('/api/v1/applications/export')->assertOk()->streamedContent();

    expect($csv)->toContain('Submitted by')->toContain('Partner')->toContain('agent')->toContain('Bright Future');
});

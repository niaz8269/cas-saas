<?php

use App\Models\Agent;
use App\Models\Country;
use App\Models\Student;
use App\Models\StudentEducation;
use App\Models\StudentGuardian;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('requires the agent guard', function () {
    $student = Student::factory()->create();

    $this->getJson("/api/v1/agent/students/{$student->id}")->assertUnauthorized();
});

it('returns the full applicant record keyed like the wizard profile bag', function () {
    $agent = actingAsAgent();
    $country = Country::factory()->create();

    $student = Student::factory()->create([
        'agent_id' => $agent->id,
        'first_name' => 'Mei',
        'last_name' => 'Lin',
        'dob' => '2004-03-11',
        'gender' => 'female',
        'city' => 'Lahore',
        'english_test' => 'IELTS',
        'english_test_score' => '7.5',
        'country_id' => $country->id,
    ]);

    StudentGuardian::create(['student_id' => $student->id, 'relation' => 'father', 'name' => 'Kamran Lin']);
    StudentEducation::create(['student_id' => $student->id, 'degree_name' => 'FSc Pre-Medical', 'level' => 'intermediate']);

    $this->getJson("/api/v1/agent/students/{$student->id}")
        ->assertOk()
        ->assertJsonPath('data.full_name', 'Mei Lin')
        ->assertJsonPath('data.profile.dob', '2004-03-11')
        ->assertJsonPath('data.profile.gender', 'female')
        ->assertJsonPath('data.profile.city', 'Lahore')
        ->assertJsonPath('data.profile.english_test_score', '7.5')
        ->assertJsonPath('data.profile.country_id', $country->id)
        ->assertJsonPath('data.guardians.0.name', 'Kamran Lin')
        ->assertJsonPath('data.education.0.degree_name', 'FSc Pre-Medical')
        // internal columns stay internal
        ->assertJsonMissingPath('data.assigned_counselor_id')
        ->assertJsonMissingPath('data.branch_id');
});

it('404s on another agents student', function () {
    actingAsAgent();
    $other = Agent::factory()->create();
    $theirs = Student::factory()->create(['agent_id' => $other->id]);

    $this->getJson("/api/v1/agent/students/{$theirs->id}")->assertNotFound();
});

it('404s on an unassigned student', function () {
    actingAsAgent();
    $unassigned = Student::factory()->create(['agent_id' => null]);

    $this->getJson("/api/v1/agent/students/{$unassigned->id}")->assertNotFound();
});

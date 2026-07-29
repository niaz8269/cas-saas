<?php

use App\Models\Activity;
use App\Models\Agent;
use App\Models\Country;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('requires the agent guard', function () {
    $this->postJson('/api/v1/agent/students', [
        'first_name' => 'Ali', 'last_name' => 'Khan',
    ])->assertUnauthorized();
});

it('creates a student attributed to the acting agent', function () {
    $agent = actingAsAgent();
    $country = Country::factory()->create();

    $response = $this->postJson('/api/v1/agent/students', [
        'first_name' => 'Ali',
        'last_name' => 'Khan',
        'email' => 'Ali.Khan@Example.com',
        'phone' => '+92 300 111 2233',
        'passport_no' => 'ab-123456',
        'country_id' => $country->id,
    ])->assertCreated()
        ->assertJsonPath('data.full_name', 'Ali Khan')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.applications_count', 0)
        ->assertJsonPath('data.country', $country->name);

    $student = Student::findOrFail($response->json('data.id'));

    expect($student->agent_id)->toBe($agent->id)
        ->and($student->student_code)->toStartWith('STU-')
        // identifiers are stored normalized, matching the lead intake
        ->and($student->email)->toBe('ali.khan@example.com')
        ->and($student->phone)->toBe('+923001112233')
        ->and($student->passport_no)->toBe('AB123456');
});

it('never lets the client choose the owning agent, code or status', function () {
    $agent = actingAsAgent();
    $other = Agent::factory()->create();

    $response = $this->postJson('/api/v1/agent/students', [
        'first_name' => 'Mei',
        'last_name' => 'Lin',
        'agent_id' => $other->id,
        'student_code' => 'STU-9999-00001',
        'status' => 'enrolled',
    ])->assertCreated();

    $student = Student::findOrFail($response->json('data.id'));

    expect($student->agent_id)->toBe($agent->id)
        ->and($student->student_code)->not->toBe('STU-9999-00001')
        ->and($student->status)->toBe('active');
});

it('writes a system timeline entry naming the partner', function () {
    $agent = actingAsAgent(['name' => 'Global Study Partners']);

    $response = $this->postJson('/api/v1/agent/students', [
        'first_name' => 'Sara', 'last_name' => 'Iqbal',
    ])->assertCreated();

    $activity = Activity::where('student_id', $response->json('data.id'))->sole();

    expect($activity->type)->toBe('system')
        ->and($activity->user_id)->toBeNull()
        ->and($activity->body)->toContain('Global Study Partners')
        ->and($activity->body)->toContain($agent->agent_code)
        ->and($activity->meta['agent_id'])->toBe($agent->id);
});

it('refuses a duplicate of a student the agent already has, naming the record', function () {
    $agent = actingAsAgent();
    $existing = Student::factory()->create([
        'agent_id' => $agent->id,
        'email' => 'ali.khan@example.com',
    ]);

    $this->postJson('/api/v1/agent/students', [
        'first_name' => 'Ali', 'last_name' => 'Khan',
        'email' => 'ALI.KHAN@example.com', // matched case-insensitively
    ])->assertStatus(409)
        ->assertJsonPath('code', 'DUPLICATE')
        ->assertJsonPath('student_id', $existing->id);

    expect(Student::count())->toBe(1);
});

it('refuses a duplicate of another agents student without leaking it', function () {
    actingAsAgent();
    $other = Agent::factory()->create();
    Student::factory()->create(['agent_id' => $other->id, 'phone' => '+923001112233']);

    $this->postJson('/api/v1/agent/students', [
        'first_name' => 'Someone', 'last_name' => 'Else',
        'phone' => '+92 300 111 2233', // same number, normalized
    ])->assertStatus(409)
        ->assertJsonPath('code', 'DUPLICATE')
        ->assertJsonPath('student_id', null);

    expect(Student::count())->toBe(1);
});

it('validates the submitted fields', function () {
    actingAsAgent();

    $this->postJson('/api/v1/agent/students', [
        'last_name' => '',
        'email' => 'not-an-email',
        'gender' => 'unknown',
        'dob' => now()->addYear()->toDateString(),
        'country_id' => 99999,
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['first_name', 'last_name', 'email', 'gender', 'dob', 'country_id']);
});

it('shows the new student on the agents own list immediately', function () {
    actingAsAgent();

    $this->postJson('/api/v1/agent/students', [
        'first_name' => 'Nadia', 'last_name' => 'Rahman',
    ])->assertCreated();

    $this->getJson('/api/v1/agent/students')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.full_name', 'Nadia Rahman');
});

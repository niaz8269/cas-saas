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
        'profile' => [
            'phone' => '+92 300 111 2233',
            'passport_no' => 'ab-123456',
            'country_id' => $country->id,
        ],
    ])->assertCreated()
        ->assertJsonPath('data.full_name', 'Ali Khan')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.applications_count', 0);

    $student = Student::findOrFail($response->json('data.id'));

    expect($student->agent_id)->toBe($agent->id)
        ->and($student->student_code)->toStartWith('STU-')
        ->and($student->country_id)->toBe($country->id)
        // identifiers are stored normalized, matching the lead intake
        ->and($student->email)->toBe('ali.khan@example.com')
        ->and($student->phone)->toBe('+923001112233')
        ->and($student->passport_no)->toBe('AB123456');
});

it('stores the whole applicant record an application is built from', function () {
    actingAsAgent();
    $country = Country::factory()->create();

    $response = $this->postJson('/api/v1/agent/students', [
        'first_name' => 'Mei',
        'last_name' => 'Lin',
        'profile' => [
            'dob' => '2004-03-11',
            'place_of_birth' => 'Lahore',
            'gender' => 'female',
            'marital_status' => 'single',
            'religion' => 'Islam',
            'chinese_name' => '林梅',
            'native_language' => 'Urdu',
            'alternate_email' => 'mei.alt@example.com',
            'wechat_id' => 'meilin88',
            'passport_issue_date' => '2022-01-01',
            'passport_expiry_date' => '2032-01-01',
            'english_test' => 'IELTS',
            'english_test_score' => '7.5',
            'english_test_date' => '2025-06-01',
            'permanent_address' => '12 Mall Road',
            'current_address' => '12 Mall Road',
            'city' => 'Lahore',
            'postal_code' => '54000',
            'country_id' => $country->id,
        ],
        'guardians' => [
            ['relation' => 'father', 'name' => 'Kamran Lin', 'occupation' => 'Engineer', 'phone' => '+923001234567'],
            ['relation' => 'mother', 'name' => 'Sadia Lin'],
        ],
        'education' => [
            ['level' => 'intermediate', 'degree_name' => 'FSc Pre-Medical', 'institution' => 'Govt College',
                'start_year' => 2021, 'end_year' => 2023, 'grade_type' => 'percentage', 'grade_value' => '88'],
        ],
    ])->assertCreated();

    $student = Student::with(['guardians', 'education'])->findOrFail($response->json('data.id'));

    expect($student->dob?->toDateString())->toBe('2004-03-11')
        ->and($student->gender)->toBe('female')
        ->and($student->chinese_name)->toBe('林梅')
        ->and($student->english_test_score)->toBe('7.5')
        ->and($student->city)->toBe('Lahore')
        ->and($student->guardians)->toHaveCount(2)
        ->and($student->guardians->pluck('name')->all())->toContain('Kamran Lin', 'Sadia Lin')
        ->and($student->education)->toHaveCount(1)
        ->and($student->education->first()->degree_name)->toBe('FSc Pre-Medical');
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

it('dedups on the phone and passport carried in the profile', function () {
    actingAsAgent();
    $other = Agent::factory()->create();
    Student::factory()->create(['agent_id' => $other->id, 'phone' => '+923001112233']);

    $this->postJson('/api/v1/agent/students', [
        'first_name' => 'Someone', 'last_name' => 'Else',
        'profile' => ['phone' => '+92 300 111 2233'], // same number, normalized
    ])->assertStatus(409)
        ->assertJsonPath('code', 'DUPLICATE')
        // another partner's student must not leak through this surface
        ->assertJsonPath('student_id', null);

    expect(Student::count())->toBe(1);
});

it('validates identity and applicant fields', function () {
    actingAsAgent();

    $this->postJson('/api/v1/agent/students', [
        'last_name' => '',
        'email' => 'not-an-email',
        'profile' => [
            'gender' => 'unknown',
            'dob' => now()->addYear()->toDateString(),
            'country_id' => 99999,
            'passport_issue_date' => '2030-01-01',
            'passport_expiry_date' => '2020-01-01', // before the issue date
        ],
        'guardians' => [['relation' => 'father']], // name missing
        'education' => [['level' => 'intermediate']], // degree_name missing
    ])->assertStatus(422)
        ->assertJsonValidationErrors([
            'first_name', 'last_name', 'email',
            'profile.gender', 'profile.dob', 'profile.country_id', 'profile.passport_expiry_date',
            'guardians.0.name', 'education.0.degree_name',
        ]);
});

it('rolls the student back if the applicant record cannot be written', function () {
    actingAsAgent();

    // 6 guardians exceeds the shared max:5 — nothing may be left behind.
    $this->postJson('/api/v1/agent/students', [
        'first_name' => 'Ali', 'last_name' => 'Khan',
        'guardians' => array_fill(0, 6, ['relation' => 'guardian', 'name' => 'X']),
    ])->assertStatus(422);

    expect(Student::count())->toBe(0);
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

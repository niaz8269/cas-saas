<?php

use App\Models\Agent;
use App\Models\AgentPayable;
use App\Models\Application;
use App\Models\Commission;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('requires the agent guard', function () {
    $this->getJson('/api/v1/agent/students')->assertUnauthorized();
});

it('lists only the agents own students', function () {
    $agent = actingAsAgent();
    $other = Agent::factory()->create();

    $mine = Student::factory()->count(2)->create(['agent_id' => $agent->id]);
    Student::factory()->create(['agent_id' => $other->id]);
    Student::factory()->create(['agent_id' => null]);

    $response = $this->getJson('/api/v1/agent/students')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        // counselor assignment and passport stay internal
        ->assertJsonMissingPath('data.0.assigned_counselor_id')
        ->assertJsonMissingPath('data.0.passport_no');

    expect(collect($response->json('data'))->pluck('student_code')->sort()->values()->all())
        ->toBe($mine->pluck('student_code')->sort()->values()->all());
});

it('lists applications attributed directly or through the student', function () {
    $agent = actingAsAgent();
    $other = Agent::factory()->create();

    // Direct attribution on the application.
    $direct = Application::factory()->create(['agent_id' => $agent->id]);
    // Inherited: application has no agent, but the student is the agent's.
    $viaStudent = Application::factory()
        ->create(['agent_id' => null, 'student_id' => Student::factory()->create(['agent_id' => $agent->id])->id]);
    // Someone else's — must not leak.
    Application::factory()->create(['agent_id' => $other->id]);

    $response = $this->getJson('/api/v1/agent/applications')->assertOk();

    $codes = collect($response->json('data'))->pluck('application_code');

    expect($codes)->toHaveCount(2)
        ->and($codes)->toContain($direct->application_code)
        ->and($codes)->toContain($viaStudent->application_code);
});

it('shows only the agents own payables with share totals and no CAS amounts', function () {
    $agent = actingAsAgent();
    $other = Agent::factory()->create();

    $commission = Commission::factory()->create(['expected_amount' => 3400, 'received_amount' => 3400]);
    AgentPayable::create([
        'commission_id' => $commission->id, 'agent_id' => $agent->id,
        'amount' => 1020, 'currency' => 'CNY', 'status' => 'payable', 'computed_at' => now(),
    ]);
    AgentPayable::create([
        'commission_id' => $commission->id, 'agent_id' => $agent->id,
        'amount' => 500, 'currency' => 'CNY', 'status' => 'paid', 'computed_at' => now(),
    ]);
    AgentPayable::create([
        'commission_id' => $commission->id, 'agent_id' => $other->id,
        'amount' => 680, 'currency' => 'CNY', 'status' => 'payable', 'computed_at' => now(),
    ]);

    $this->getJson('/api/v1/agent/commissions')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('totals.payable', 1020)
        ->assertJsonPath('totals.paid', 500)
        // the CAS↔university economics never reach this surface
        ->assertJsonMissingPath('data.0.commission')
        ->assertJsonMissingPath('data.0.expected_amount')
        ->assertJsonMissingPath('data.0.received_amount');
});

it('filters students by status', function () {
    $agent = actingAsAgent();
    Student::factory()->create(['agent_id' => $agent->id, 'status' => 'arrived']);
    Student::factory()->create(['agent_id' => $agent->id, 'status' => 'active']);

    $this->getJson('/api/v1/agent/students?filter[status]=arrived')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'arrived');
});

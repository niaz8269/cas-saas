<?php

use App\Models\Agent;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ── Agent portal ─────────────────────────────────────────────────────────

it('logs an agent in and stamps last_login_at', function () {
    $agent = Agent::factory()->create([
        'email' => 'partner@example.com',
        'password' => 'Secret#123',
        'status' => 'active',
    ]);

    $this->postJson('/api/v1/agent/auth/login', [
        'email' => 'partner@example.com',
        'password' => 'Secret#123',
    ])
        ->assertOk()
        ->assertJsonStructure(['token', 'token_type', 'agent' => ['id', 'agent_code', 'name']])
        ->assertJsonMissingPath('agent.password');

    expect($agent->refresh()->last_login_at)->not->toBeNull();
});

it('rejects wrong passwords and unactivated agent accounts identically', function () {
    Agent::factory()->create(['email' => 'activated@example.com', 'password' => 'Secret#123']);
    Agent::factory()->create(['email' => 'dormant@example.com', 'password' => null]);

    $wrong = $this->postJson('/api/v1/agent/auth/login', [
        'email' => 'activated@example.com', 'password' => 'nope',
    ])->assertStatus(422)->json('message');

    $dormant = $this->postJson('/api/v1/agent/auth/login', [
        'email' => 'dormant@example.com', 'password' => 'anything',
    ])->assertStatus(422)->json('message');

    // Same envelope — activation status is not revealed.
    expect($dormant)->toBe($wrong);
});

it('blocks inactive agents with ACCOUNT_INACTIVE', function () {
    Agent::factory()->create([
        'email' => 'suspended@example.com',
        'password' => 'Secret#123',
        'status' => 'suspended',
    ]);

    $this->postJson('/api/v1/agent/auth/login', [
        'email' => 'suspended@example.com', 'password' => 'Secret#123',
    ])
        ->assertForbidden()
        ->assertJsonPath('code', 'ACCOUNT_INACTIVE');
});

it('returns the agent profile from me and revokes on logout', function () {
    $agent = Agent::factory()->create(['email' => 'me@example.com', 'password' => 'Secret#123']);

    $token = $this->postJson('/api/v1/agent/auth/login', [
        'email' => 'me@example.com', 'password' => 'Secret#123',
    ])->json('token');

    $headers = ['Authorization' => "Bearer {$token}"];

    $this->getJson('/api/v1/agent/auth/me', $headers)
        ->assertOk()
        ->assertJsonPath('data.agent_code', $agent->agent_code);

    $this->postJson('/api/v1/agent/auth/logout', [], $headers)->assertOk();

    app('auth')->forgetGuards();

    $this->getJson('/api/v1/agent/auth/me', $headers)->assertUnauthorized();
});

// ── Student portal ───────────────────────────────────────────────────────

it('logs a student in and returns the portal profile', function () {
    Student::factory()->create([
        'email' => 'ali@example.com',
        'password' => 'Secret#123',
        'status' => 'enrolled',
    ]);

    $this->postJson('/api/v1/student/auth/login', [
        'email' => 'ali@example.com',
        'password' => 'Secret#123',
    ])
        ->assertOk()
        ->assertJsonStructure(['token', 'token_type', 'student' => ['id', 'student_code', 'full_name']])
        ->assertJsonMissingPath('student.password')
        ->assertJsonMissingPath('student.assigned_counselor_id');
});

it('blocks withdrawn students with ACCOUNT_INACTIVE', function () {
    Student::factory()->create([
        'email' => 'gone@example.com',
        'password' => 'Secret#123',
        'status' => 'withdrawn',
    ]);

    $this->postJson('/api/v1/student/auth/login', [
        'email' => 'gone@example.com', 'password' => 'Secret#123',
    ])
        ->assertForbidden()
        ->assertJsonPath('code', 'ACCOUNT_INACTIVE');
});

// ── Guard separation ─────────────────────────────────────────────────────

it('keeps tokens inside their own guard', function () {
    $agent = Agent::factory()->create(['email' => 'cross@example.com', 'password' => 'Secret#123']);

    $agentToken = $this->postJson('/api/v1/agent/auth/login', [
        'email' => 'cross@example.com', 'password' => 'Secret#123',
    ])->json('token');

    $staff = actingAsStaffWith([]);
    $staffToken = $staff->createToken('test')->plainTextToken;

    app('auth')->forgetGuards();

    // Agent token on staff and student surfaces → 401.
    $this->getJson('/api/v1/auth/me', ['Authorization' => "Bearer {$agentToken}"])
        ->assertUnauthorized();
    app('auth')->forgetGuards();
    $this->getJson('/api/v1/student/auth/me', ['Authorization' => "Bearer {$agentToken}"])
        ->assertUnauthorized();
    app('auth')->forgetGuards();

    // Staff token on the agent surface → 401.
    $this->getJson('/api/v1/agent/auth/me', ['Authorization' => "Bearer {$staffToken}"])
        ->assertUnauthorized();
});

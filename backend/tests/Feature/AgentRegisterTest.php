<?php

use App\Models\Agent;
use App\Models\Country;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function agentRegisterPayload(array $overrides = []): array
{
    return array_merge([
        'company_name' => 'Bright Future Consultancy',
        'contact_name' => 'Sara Khan',
        'email' => 'partner@example.com',
        'phone' => '+92 300 1234567',
        'website' => 'https://brightfuture.example',
        'address' => '12 Mall Road, Lahore',
        'country_id' => Country::factory()->create()->id,
        'password' => 'secret1234',
        'password_confirmation' => 'secret1234',
    ], $overrides);
}

it('creates a PENDING agent request without issuing a token', function () {
    $this->postJson('/api/v1/agent/auth/register', agentRegisterPayload())
        ->assertCreated()
        ->assertJsonPath('code', 'PENDING_APPROVAL')
        ->assertJsonMissingPath('token');

    $agent = Agent::firstOrFail();
    expect($agent->status)->toBe('pending')
        ->and($agent->type)->toBe('partner')
        ->and($agent->name)->toBe('Bright Future Consultancy')
        ->and($agent->contact_name)->toBe('Sara Khan')
        ->and($agent->website)->toBe('https://brightfuture.example')
        ->and($agent->address)->toBe('12 Mall Road, Lahore')
        ->and($agent->agent_code)->toStartWith('AGT-')
        ->and(Hash::check('secret1234', $agent->password))->toBeTrue()
        ->and($agent->tokens()->count())->toBe(0);
});

it('does not let a pending agent sign in', function () {
    $this->postJson('/api/v1/agent/auth/register', agentRegisterPayload())->assertCreated();

    $this->postJson('/api/v1/agent/auth/login', [
        'email' => 'partner@example.com',
        'password' => 'secret1234',
    ])
        ->assertStatus(403)
        ->assertJsonPath('code', 'PENDING_APPROVAL');
});

it('lets an approved (active) agent sign in', function () {
    $this->postJson('/api/v1/agent/auth/register', agentRegisterPayload())->assertCreated();
    Agent::where('email', 'partner@example.com')->update(['status' => 'active']); // admin approval

    $this->postJson('/api/v1/agent/auth/login', [
        'email' => 'partner@example.com',
        'password' => 'secret1234',
    ])->assertOk()->assertJsonStructure(['token', 'agent']);
});

it('rejects an email that already belongs to an agent', function () {
    Agent::factory()->create(['email' => 'taken@example.com']);

    $this->postJson('/api/v1/agent/auth/register', agentRegisterPayload(['email' => 'taken@example.com']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');
});

it('requires the full partner application', function () {
    $this->postJson('/api/v1/agent/auth/register', ['email' => 'not-an-email'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['company_name', 'contact_name', 'phone', 'website', 'address', 'country_id', 'password', 'email']);
});

it('does not create a Student when an agent registers', function () {
    $this->postJson('/api/v1/agent/auth/register', agentRegisterPayload())->assertCreated();

    expect(Student::count())->toBe(0);
});

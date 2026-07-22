<?php

use App\Models\Agent;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lists partner requests (filterable by status) for a permitted admin', function () {
    actingAsStaffWith(['agents.view.global']);
    Agent::factory()->create(['status' => 'pending', 'name' => 'Bright Future', 'contact_name' => 'Sara', 'email' => 'p@x.com']);
    Agent::factory()->create(['status' => 'active']);

    $this->getJson('/api/v1/agents?filter[status]=pending')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.company_name', 'Bright Future')
        ->assertJsonPath('data.0.contact_name', 'Sara')
        ->assertJsonPath('data.0.status', 'pending');
});

it('approves a pending partner request so the agent can sign in', function () {
    actingAsStaffWith(['agents.manage.global']);
    $agent = Agent::factory()->create(['status' => 'pending']);

    $this->postJson("/api/v1/agents/{$agent->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    expect($agent->fresh()->status)->toBe('active');
});

it('rejects a pending partner request', function () {
    actingAsStaffWith(['agents.manage.global']);
    $agent = Agent::factory()->create(['status' => 'pending']);

    $this->postJson("/api/v1/agents/{$agent->id}/reject")
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected');

    expect($agent->fresh()->status)->toBe('rejected');
});

it('will not approve an agent that is not pending', function () {
    actingAsStaffWith(['agents.manage.global']);
    $agent = Agent::factory()->create(['status' => 'active']);

    $this->postJson("/api/v1/agents/{$agent->id}/approve")->assertStatus(409);
});

it('denies approve/reject without the manage permission', function () {
    actingAsStaffWith(['agents.view.global']); // view only
    $agent = Agent::factory()->create(['status' => 'pending']);

    $this->postJson("/api/v1/agents/{$agent->id}/approve")->assertForbidden();
    $this->postJson("/api/v1/agents/{$agent->id}/reject")->assertForbidden();
    expect($agent->fresh()->status)->toBe('pending');
});

it('denies the partner list without the view permission', function () {
    actingAsStaffWith([]);

    $this->getJson('/api/v1/agents')->assertForbidden();
});

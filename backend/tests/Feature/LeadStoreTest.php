<?php

use App\Models\Lead;
use App\Models\MarketingSource;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lets a permitted staff member add a lead', function () {
    actingAsStaffWith(['leads.create.global', 'leads.view.global']);

    $this->postJson('/api/v1/leads', [
        'first_name' => 'Ayesha',
        'last_name' => 'Malik',
        'email' => 'ayesha@example.com',
        'intake_route' => 'full',
    ])->assertCreated();

    $lead = Lead::firstOrFail();
    expect($lead->first_name)->toBe('Ayesha')
        ->and($lead->status)->toBe('new')
        ->and($lead->intake_route)->toBe('full');
});

it('denies adding a lead without the create permission', function () {
    actingAsStaffWith(['leads.view.global']);

    $this->postJson('/api/v1/leads', [
        'first_name' => 'Ayesha',
        'email' => 'ayesha@example.com',
    ])->assertForbidden();

    expect(Lead::count())->toBe(0);
});

it('requires a name and at least one contact method', function () {
    actingAsStaffWith(['leads.create.global']);

    $this->postJson('/api/v1/leads', ['first_name' => 'Ayesha'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email', 'phone']);

    $this->postJson('/api/v1/leads', ['email' => 'x@example.com'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('first_name');
});

it('assigns and opens a 48h follow-up task when assigned at creation', function () {
    actingAsStaffWith(['leads.create.global']);
    $counselor = User::factory()->create();

    $this->postJson('/api/v1/leads', [
        'first_name' => 'Ayesha',
        'phone' => '+92 300 1112222',
        'assigned_user_id' => $counselor->id,
    ])->assertCreated();

    $lead = Lead::firstOrFail();
    expect($lead->status)->toBe('assigned')
        ->and($lead->assigned_user_id)->toBe($counselor->id);

    expect(Task::where('related_type', Lead::class)->where('related_id', $lead->id)
        ->where('assignee_id', $counselor->id)->exists())->toBeTrue();
});

it('lists marketing sources for the picker', function () {
    actingAsStaffWith(['leads.view.global']);
    MarketingSource::create(['name' => 'Walk-in', 'channel' => 'direct']);

    $this->getJson('/api/v1/leads/sources')
        ->assertOk()
        ->assertJsonFragment(['name' => 'Walk-in']);
});

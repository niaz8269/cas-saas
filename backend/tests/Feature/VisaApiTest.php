<?php

use App\Models\Application;
use App\Models\User;
use App\Models\VisaCase;
use App\Models\VisaChecklistItem;
use App\Services\Visa\VisaWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

const VISA_PERMS = ['visa.view.global', 'visa.manage.global'];

it('denies the visa list without visa.view', function () {
    actingAsStaffWith([]);

    $this->getJson('/api/v1/visa-cases')->assertForbidden();
});

it('lists cases with pipeline meta', function () {
    actingAsStaffWith(['visa.view.global']);
    VisaCase::factory()->create();
    VisaCase::factory()->create(['status' => 'submitted']);

    $this->getJson('/api/v1/visa-cases')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('pipeline.not_started', 1)
        ->assertJsonPath('pipeline.submitted', 1);
});

it('limits assigned scope to the officer or counselor', function () {
    $officer = actingAsStaffWith(['visa.view.assigned']);

    $mine = VisaCase::factory()->create(['assigned_visa_officer_id' => $officer->id]);
    VisaCase::factory()->create(); // someone else's

    $this->getJson('/api/v1/visa-cases')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $mine->id);
});

it('shows a case with checklist and history', function () {
    $user = actingAsStaffWith(['visa.view.global']);
    $case = app(VisaWorkflow::class)->openCase(Application::factory()->create(), $user);

    $this->getJson("/api/v1/visa-cases/{$case->id}")
        ->assertOk()
        ->assertJsonCount(6, 'data.checklist')
        ->assertJsonCount(1, 'data.status_history')
        ->assertJsonPath('data.status', 'not_started');
});

it('requires visa.manage to transition', function () {
    actingAsStaffWith(['visa.view.global']);
    $case = VisaCase::factory()->create();

    $this->postJson("/api/v1/visa-cases/{$case->id}/transition", ['status' => 'documents_collection'])
        ->assertForbidden();
});

it('transitions a case and rejects illegal jumps', function () {
    actingAsStaffWith(VISA_PERMS);
    $case = VisaCase::factory()->create();

    $this->postJson("/api/v1/visa-cases/{$case->id}/transition", ['status' => 'documents_collection'])
        ->assertOk()
        ->assertJsonPath('data.status', 'documents_collection');

    $this->postJson("/api/v1/visa-cases/{$case->id}/transition", ['status' => 'travel_ready'])
        ->assertStatus(409);
});

it('returns the missing checklist on premature submission', function () {
    actingAsStaffWith(VISA_PERMS);
    $case = VisaCase::factory()->create(['status' => 'appointment_booked']);
    VisaChecklistItem::factory()->for($case, 'visaCase')->create([
        'name' => 'JW202 Form', 'is_required' => true, 'status' => 'pending',
    ]);

    $this->postJson("/api/v1/visa-cases/{$case->id}/transition", ['status' => 'submitted'])
        ->assertStatus(409)
        ->assertJsonPath('code', 'CHECKLIST_INCOMPLETE')
        ->assertJsonPath('missing.0', 'JW202 Form');
});

it('assigns a visa officer', function () {
    actingAsStaffWith(VISA_PERMS);
    $case = VisaCase::factory()->create();
    $officer = User::factory()->create();

    $this->postJson("/api/v1/visa-cases/{$case->id}/assign", ['user_id' => $officer->id])
        ->assertOk()
        ->assertJsonPath('data.officer.id', $officer->id);
});

it('updates a checklist item and 404s across cases', function () {
    actingAsStaffWith(VISA_PERMS);
    $case = VisaCase::factory()->create();
    $item = VisaChecklistItem::factory()->for($case, 'visaCase')->create();
    $foreign = VisaChecklistItem::factory()->create(); // belongs to another case

    $this->patchJson("/api/v1/visa-cases/{$case->id}/checklist/{$item->id}", ['status' => 'received'])
        ->assertOk()
        ->assertJsonPath('data.status', 'received');

    $this->patchJson("/api/v1/visa-cases/{$case->id}/checklist/{$foreign->id}", ['status' => 'received'])
        ->assertNotFound();
});

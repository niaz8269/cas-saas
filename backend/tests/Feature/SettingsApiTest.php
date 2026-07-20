<?php

use App\Models\AutomationRule;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lets a settings manager disable an automation rule', function () {
    actingAsStaffWith(['settings.manage.global']);
    $rule = AutomationRule::factory()->create(['is_active' => true]);

    $this->patchJson("/api/v1/automation-rules/{$rule->id}", ['is_active' => false])
        ->assertOk()
        ->assertJsonPath('data.is_active', false);

    expect($rule->fresh()->is_active)->toBeFalse();
});

it('re-enables a paused automation rule', function () {
    actingAsStaffWith(['settings.manage.global']);
    $rule = AutomationRule::factory()->create(['is_active' => false]);

    $this->patchJson("/api/v1/automation-rules/{$rule->id}", ['is_active' => true])
        ->assertOk()
        ->assertJsonPath('data.is_active', true);

    expect($rule->fresh()->is_active)->toBeTrue();
});

it('denies toggling an automation rule without settings.manage', function () {
    actingAsStaffWith([]);
    $rule = AutomationRule::factory()->create();

    $this->patchJson("/api/v1/automation-rules/{$rule->id}", ['is_active' => false])
        ->assertStatus(403);
});

it('validates is_active when toggling a rule', function () {
    actingAsStaffWith(['settings.manage.global']);
    $rule = AutomationRule::factory()->create();

    $this->patchJson("/api/v1/automation-rules/{$rule->id}", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors('is_active');
});

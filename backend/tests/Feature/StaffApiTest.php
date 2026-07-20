<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

it('lists staff (id + name only) for any authenticated staff member', function () {
    actingAsStaffWith([]);
    User::factory()->count(2)->create();

    $this->getJson('/api/v1/staff')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name']]])
        ->assertJsonMissingPath('data.0.email')
        ->assertJsonCount(3, 'data'); // the acting user + two others
});

it('filters the staff directory by role', function () {
    actingAsStaffWith([]);
    $role = Role::findOrCreate('Admissions', 'staff');
    $officer = User::factory()->create(['name' => 'Ophelia Officer']);
    $officer->assignRole($role);
    User::factory()->create(['name' => 'Regular Rita']);

    $response = $this->getJson('/api/v1/staff?role=Admissions')->assertOk();

    expect($response->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.name'))->toBe('Ophelia Officer');
});

it('requires authentication to list staff', function () {
    $this->getJson('/api/v1/staff')->assertStatus(401);
});

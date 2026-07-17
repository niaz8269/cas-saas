<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

it('denies the staff directory without users.manage.global', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user, guard: 'staff');

    $this->getJson('/api/v1/users')
        ->assertStatus(403)
        ->assertJsonPath('code', 'FORBIDDEN');
});

it('allows the staff directory with the explicit permission', function () {
    Permission::findOrCreate('users.manage.global', 'staff');
    $user = User::factory()->create();
    $user->givePermissionTo('users.manage.global');
    Sanctum::actingAs($user, guard: 'staff');

    $this->getJson('/api/v1/users')
        ->assertOk()
        ->assertJsonStructure(['data', 'meta' => ['current_page', 'per_page', 'total']]);
});

it('allows Super Admin through the gate bypass', function () {
    Role::findOrCreate('Super Admin', 'staff');
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    Sanctum::actingAs($admin, guard: 'staff');

    $this->getJson('/api/v1/users')->assertOk();
});

it('rejects unauthenticated access to the directory', function () {
    $this->getJson('/api/v1/users')
        ->assertStatus(401)
        ->assertJsonPath('code', 'UNAUTHENTICATED');
});

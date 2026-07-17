<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

it('lists visa-capable officers (direct and role-granted) for the picker', function () {
    $permission = Permission::findOrCreate('visa.manage.global', 'staff');

    // Direct permission holder.
    $direct = User::factory()->create(['name' => 'Officer Wang']);
    $direct->givePermissionTo($permission);

    // Role-granted holder.
    $role = Role::findOrCreate('Visa', 'staff');
    $role->givePermissionTo($permission);
    $viaRole = User::factory()->create(['name' => 'Officer Li']);
    $viaRole->assignRole($role);

    // No visa-manage capability — must not appear.
    $outsider = User::factory()->create(['name' => 'Marketing Mia']);

    actingAsStaffWith(['visa.view.global']);

    $ids = collect($this->getJson('/api/v1/visa-officers')->assertOk()->json('data'))->pluck('id');

    expect($ids)->toContain($direct->id)
        ->toContain($viaRole->id)
        ->not->toContain($outsider->id);
});

it('denies the officer directory without visa view scope', function () {
    actingAsStaffWith([]);

    $this->getJson('/api/v1/visa-officers')->assertForbidden();
});

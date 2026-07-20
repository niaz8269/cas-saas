<?php

use App\Models\Branch;
use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

const USER_ADMIN_PERMS = ['users.manage.global'];

function actingAsSuperAdmin(): User
{
    Role::findOrCreate('Super Admin', 'staff');
    $user = User::factory()->create();
    $user->assignRole('Super Admin');
    Sanctum::actingAs($user, guard: 'staff');

    return $user;
}

it('lets a user-manager create a staff user with a role', function () {
    actingAsStaffWith(USER_ADMIN_PERMS);
    Role::findOrCreate('Counselor', 'staff');
    $branch = Branch::factory()->create();

    $this->postJson('/api/v1/users', [
        'name' => 'New Counselor',
        'email' => 'newc@example.com',
        'password' => 'secret-pass-123',
        'branch_id' => $branch->id,
        'roles' => ['Counselor'],
    ])
        ->assertCreated()
        ->assertJsonPath('data.email', 'newc@example.com')
        ->assertJsonPath('data.roles', ['Counselor']);

    $user = User::where('email', 'newc@example.com')->first();
    expect($user)->not->toBeNull()
        ->and($user->hasRole('Counselor'))->toBeTrue()
        ->and($user->branch_id)->toBe($branch->id)
        ->and(Hash::check('secret-pass-123', $user->password))->toBeTrue();
});

it('rejects a duplicate email on creation', function () {
    actingAsStaffWith(USER_ADMIN_PERMS);
    User::factory()->create(['email' => 'dupe@example.com']);

    $this->postJson('/api/v1/users', [
        'name' => 'X', 'email' => 'dupe@example.com', 'password' => 'secret-pass-123',
    ])->assertStatus(422)->assertJsonValidationErrors('email');
});

it('denies user creation without users.manage', function () {
    actingAsStaffWith([]);

    $this->postJson('/api/v1/users', [
        'name' => 'X', 'email' => 'x@example.com', 'password' => 'secret-pass-123',
    ])->assertStatus(403);
});

it('blocks a non-super-admin from granting the Super Admin role', function () {
    actingAsStaffWith(USER_ADMIN_PERMS);
    Role::findOrCreate('Super Admin', 'staff');

    $this->postJson('/api/v1/users', [
        'name' => 'Escalate', 'email' => 'esc@example.com',
        'password' => 'secret-pass-123', 'roles' => ['Super Admin'],
    ])->assertStatus(403);

    expect(User::where('email', 'esc@example.com')->exists())->toBeFalse();
});

it('lets a Super Admin grant the Super Admin role', function () {
    actingAsSuperAdmin();

    $this->postJson('/api/v1/users', [
        'name' => 'Deputy', 'email' => 'dep@example.com',
        'password' => 'secret-pass-123', 'roles' => ['Super Admin'],
    ])->assertCreated()->assertJsonPath('data.roles', ['Super Admin']);
});

it('blocks a non-super-admin from editing a Super Admin account', function () {
    actingAsStaffWith(USER_ADMIN_PERMS);
    Role::findOrCreate('Super Admin', 'staff');
    $target = User::factory()->create(['name' => 'Untouchable']);
    $target->assignRole('Super Admin');

    $this->patchJson("/api/v1/users/{$target->id}", ['name' => 'Hacked'])
        ->assertStatus(403);

    expect($target->fresh()->name)->toBe('Untouchable');
});

it('updates a user and rotates the password only when supplied', function () {
    actingAsStaffWith(USER_ADMIN_PERMS);
    Role::findOrCreate('Finance', 'staff');
    $user = User::factory()->create(['name' => 'Old Name']);
    $originalHash = $user->password;

    // No password field → password unchanged.
    $this->patchJson("/api/v1/users/{$user->id}", ['name' => 'New Name', 'roles' => ['Finance']])
        ->assertOk()
        ->assertJsonPath('data.name', 'New Name')
        ->assertJsonPath('data.roles', ['Finance']);
    expect($user->fresh()->password)->toBe($originalHash);

    // With password → rotated.
    $this->patchJson("/api/v1/users/{$user->id}", ['password' => 'brand-new-pass-9'])->assertOk();
    expect(Hash::check('brand-new-pass-9', $user->fresh()->password))->toBeTrue();
});

it('prevents deactivating your own account', function () {
    $me = actingAsStaffWith(USER_ADMIN_PERMS);

    $this->patchJson("/api/v1/users/{$me->id}", ['status' => 'inactive'])
        ->assertStatus(422)->assertJsonValidationErrors('status');

    expect($me->fresh()->status)->toBe('active');
});

it('lists assignable roles only for user-managers', function () {
    actingAsStaffWith([]);
    $this->getJson('/api/v1/roles')->assertStatus(403);

    actingAsStaffWith(USER_ADMIN_PERMS);
    Role::findOrCreate('Admin', 'staff');
    $this->getJson('/api/v1/roles')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name']]]);
});

it('returns the role→permission matrix, excluding Super Admin', function () {
    actingAsStaffWith(USER_ADMIN_PERMS);
    Role::findOrCreate('Super Admin', 'staff');
    $admin = Role::findOrCreate('Admin', 'staff');
    $perm = Permission::findOrCreate('students.view.global', 'staff');
    $admin->givePermissionTo($perm);

    $response = $this->getJson('/api/v1/roles/matrix')
        ->assertOk()
        ->assertJsonStructure(['data' => ['permissions', 'roles' => [['name', 'permissions']]]]);

    $data = $response->json('data');
    expect($data['permissions'])->toContain('students.view.global')
        ->and(collect($data['roles'])->pluck('name'))->not->toContain('Super Admin')
        ->and(collect($data['roles'])->firstWhere('name', 'Admin')['permissions'])
        ->toContain('students.view.global');
});

it('denies the role matrix without users.manage', function () {
    actingAsStaffWith([]);
    $this->getJson('/api/v1/roles/matrix')->assertStatus(403);
});

it('lists active branches and departments for any staff', function () {
    actingAsStaffWith([]);
    Branch::factory()->create(['is_active' => true]);
    Branch::factory()->create(['is_active' => false]);
    Department::factory()->create(['is_active' => true]);

    $this->getJson('/api/v1/branches')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/departments')->assertOk()->assertJsonCount(1, 'data');
});

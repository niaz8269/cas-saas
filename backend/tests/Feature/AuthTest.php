<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

it('logs a staff member in and returns a token with the user payload', function () {
    $user = User::factory()->create(['email' => 'staff@cas.moe']);
    Role::findOrCreate('Counselor', 'staff');
    Permission::findOrCreate('leads.view.assigned', 'staff');
    $user->assignRole('Counselor');
    $user->givePermissionTo('leads.view.assigned');

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'staff@cas.moe',
        'password' => 'password',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['token', 'token_type', 'user' => ['id', 'name', 'email', 'roles', 'permissions']])
        ->assertJsonPath('user.email', 'staff@cas.moe')
        ->assertJsonPath('user.roles.0', 'Counselor');

    expect($user->fresh()->last_login_at)->not->toBeNull();
});

it('rejects invalid credentials with the validation envelope', function () {
    User::factory()->create(['email' => 'staff@cas.moe']);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'staff@cas.moe',
        'password' => 'wrong-password',
    ])
        ->assertStatus(422)
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonValidationErrors(['email']);
});

it('rejects inactive accounts with ACCOUNT_INACTIVE', function () {
    User::factory()->inactive()->create(['email' => 'gone@cas.moe']);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'gone@cas.moe',
        'password' => 'password',
    ])
        ->assertStatus(403)
        ->assertJsonPath('code', 'ACCOUNT_INACTIVE');
});

it('rate limits repeated login attempts', function () {
    User::factory()->create(['email' => 'staff@cas.moe']);

    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'staff@cas.moe',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    $this->postJson('/api/v1/auth/login', [
        'email' => 'staff@cas.moe',
        'password' => 'wrong-password',
    ])
        ->assertStatus(429)
        ->assertJsonPath('code', 'RATE_LIMITED');
});

it('requires authentication for /auth/me', function () {
    $this->getJson('/api/v1/auth/me')
        ->assertStatus(401)
        ->assertJsonPath('code', 'UNAUTHENTICATED');
});

it('returns the profile for a valid bearer token', function () {
    User::factory()->create(['email' => 'staff@cas.moe']);

    $token = $this->postJson('/api/v1/auth/login', [
        'email' => 'staff@cas.moe',
        'password' => 'password',
    ])->json('token');

    $this->getJson('/api/v1/auth/me', ['Authorization' => "Bearer {$token}"])
        ->assertOk()
        ->assertJsonPath('data.email', 'staff@cas.moe');
});

it('revokes the token on logout', function () {
    User::factory()->create(['email' => 'staff@cas.moe']);

    $token = $this->postJson('/api/v1/auth/login', [
        'email' => 'staff@cas.moe',
        'password' => 'password',
    ])->json('token');

    $this->postJson('/api/v1/auth/logout', [], ['Authorization' => "Bearer {$token}"])
        ->assertOk();

    expect(PersonalAccessToken::count())->toBe(0);

    // Guards are memoized within a single test; reset to simulate a fresh request.
    app('auth')->forgetGuards();

    $this->getJson('/api/v1/auth/me', ['Authorization' => "Bearer {$token}"])
        ->assertStatus(401);
});

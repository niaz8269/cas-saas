<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\StaffUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('does not seed the public demo staff accounts in production', function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->app->detectEnvironment(fn () => 'production');

    app(StaffUserSeeder::class)->run(); // db:seed itself would ask for confirmation in production

    expect(User::where('email', 'admin@cas.moe')->exists())->toBeFalse();
});

it('still seeds the demo staff accounts outside production', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->seed(StaffUserSeeder::class);

    expect(User::where('email', 'admin@cas.moe')->exists())->toBeTrue();
});

it('creates a Super Admin with a hidden password', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->artisan('cas:create-admin', ['email' => 'owner@cas.moe', 'name' => 'Owner'])
        ->expectsQuestion('Password (at least 12 characters)', 'a-long-secret-pass')
        ->expectsQuestion('Repeat the password', 'a-long-secret-pass')
        ->expectsOutputToContain('Super Admin ready: owner@cas.moe')
        ->assertSuccessful();

    $user = User::where('email', 'owner@cas.moe')->firstOrFail();
    expect($user->hasRole('Super Admin'))->toBeTrue()
        ->and(Hash::check('a-long-secret-pass', $user->password))->toBeTrue();
});

it('refuses a short or mismatched admin password', function () {
    $this->artisan('cas:create-admin', ['email' => 'owner@cas.moe'])
        ->expectsQuestion('Password (at least 12 characters)', 'short')
        ->expectsQuestion('Repeat the password', 'short')
        ->assertFailed();

    $this->artisan('cas:create-admin', ['email' => 'owner@cas.moe'])
        ->expectsQuestion('Password (at least 12 characters)', 'a-long-secret-pass')
        ->expectsQuestion('Repeat the password', 'different-long-pass')
        ->assertFailed();

    expect(User::where('email', 'owner@cas.moe')->exists())->toBeFalse();
});

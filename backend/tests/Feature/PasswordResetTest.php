<?php

use App\Mail\ResetPasswordMail;
use App\Models\Agent;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    Mail::fake();
    Cache::flush(); // clears the throttle counters
});

/** Ask for a reset and pull the token out of the emailed link. */
function requestToken(string $audience, string $email): string
{
    test()->postJson("/api/v1/auth/{$audience}/forgot-password", ['email' => $email])->assertOk();

    $token = null;
    Mail::assertSent(ResetPasswordMail::class, function (ResetPasswordMail $m) use (&$token) {
        parse_str((string) parse_url($m->resetUrl, PHP_URL_QUERY), $q);
        $token = $q['token'];

        return true;
    });

    return (string) $token;
}

it('resets a staff password end to end and signs old sessions out', function () {
    $user = User::factory()->create(['email' => 'boss@cas.moe', 'password' => 'old-password-1']);
    $user->createToken('cas-spa');

    $token = requestToken('staff', 'Boss@cas.moe');

    $this->postJson('/api/v1/auth/staff/reset-password', [
        'email' => 'boss@cas.moe', 'token' => $token,
        'password' => 'brand-new-pass-9', 'password_confirmation' => 'brand-new-pass-9',
    ])->assertOk();

    expect(Hash::check('brand-new-pass-9', $user->fresh()->password))->toBeTrue()
        ->and($user->tokens()->count())->toBe(0);

    $this->postJson('/api/v1/auth/login', ['email' => 'boss@cas.moe', 'password' => 'brand-new-pass-9', 'device_name' => 'x'])->assertOk();
});

it('works for students and agents and links to the portal', function () {
    Student::factory()->create(['email' => 's@x.com', 'password' => 'old-password-1']);
    Agent::factory()->create(['email' => 'a@x.com', 'password' => 'old-password-1']);

    foreach (['student' => 's@x.com', 'agent' => 'a@x.com'] as $audience => $email) {
        Mail::fake();
        $token = requestToken($audience, $email);

        Mail::assertSent(ResetPasswordMail::class, fn ($m) => str_contains($m->resetUrl, '/portal/reset-password') && str_contains($m->resetUrl, "as={$audience}"));

        $this->postJson("/api/v1/auth/{$audience}/reset-password", [
            'email' => $email, 'token' => $token,
            'password' => 'brand-new-pass-9', 'password_confirmation' => 'brand-new-pass-9',
        ])->assertOk();
    }

    expect(Hash::check('brand-new-pass-9', Student::where('email', 's@x.com')->value('password')))->toBeTrue()
        ->and(Hash::check('brand-new-pass-9', Agent::where('email', 'a@x.com')->value('password')))->toBeTrue();
});

it('answers the same whether or not the account exists, and sends nothing for unknown emails', function () {
    $a = $this->postJson('/api/v1/auth/staff/forgot-password', ['email' => 'nobody@x.com'])->assertOk()->json('message');
    User::factory()->create(['email' => 'real@cas.moe']);
    $b = $this->postJson('/api/v1/auth/staff/forgot-password', ['email' => 'real@cas.moe'])->assertOk()->json('message');

    expect($a)->toBe($b);
    Mail::assertSent(ResetPasswordMail::class, 1);
});

it('keeps the same email as different account types separate', function () {
    User::factory()->create(['email' => 'same@x.com']);
    Student::factory()->create(['email' => 'same@x.com']);

    $staffToken = requestToken('staff', 'same@x.com');

    // A staff token must not reset the student with the same address.
    $this->postJson('/api/v1/auth/student/reset-password', [
        'email' => 'same@x.com', 'token' => $staffToken,
        'password' => 'brand-new-pass-9', 'password_confirmation' => 'brand-new-pass-9',
    ])->assertStatus(422)->assertJsonPath('code', 'invalid_reset_token');
});

it('rejects a wrong, reused or expired token', function () {
    User::factory()->create(['email' => 'boss@cas.moe']);
    $token = requestToken('staff', 'boss@cas.moe');
    $payload = fn (string $t) => ['email' => 'boss@cas.moe', 'token' => $t, 'password' => 'brand-new-pass-9', 'password_confirmation' => 'brand-new-pass-9'];

    $this->postJson('/api/v1/auth/staff/reset-password', $payload('wrong'))->assertStatus(422);

    $this->postJson('/api/v1/auth/staff/reset-password', $payload($token))->assertOk();
    $this->postJson('/api/v1/auth/staff/reset-password', $payload($token))->assertStatus(422); // single use

    Mail::fake();
    Cache::flush(); // clears the throttle counters
    $token2 = requestToken('staff', 'boss@cas.moe');
    DB::table('password_reset_tokens')->update(['created_at' => now()->subMinutes(61)]);
    Cache::flush(); // clears the throttle counters
    $this->postJson('/api/v1/auth/staff/reset-password', $payload($token2))->assertStatus(422);
});

it('validates the new password and does not store the token in plain text', function () {
    User::factory()->create(['email' => 'boss@cas.moe']);
    $token = requestToken('staff', 'boss@cas.moe');

    $this->postJson('/api/v1/auth/staff/reset-password', [
        'email' => 'boss@cas.moe', 'token' => $token, 'password' => 'short', 'password_confirmation' => 'short',
    ])->assertStatus(422)->assertJsonValidationErrors('password');

    expect(DB::table('password_reset_tokens')->value('token'))->not->toBe($token);
});

it('does not send a second link within a minute', function () {
    User::factory()->create(['email' => 'boss@cas.moe']);

    $this->postJson('/api/v1/auth/staff/forgot-password', ['email' => 'boss@cas.moe'])->assertOk();
    $this->postJson('/api/v1/auth/staff/forgot-password', ['email' => 'boss@cas.moe'])->assertOk();

    Mail::assertSent(ResetPasswordMail::class, 1);
});

it('returns 404 for an unknown account type', function () {
    $this->postJson('/api/v1/auth/robot/forgot-password', ['email' => 'a@b.com'])->assertClientError();
});

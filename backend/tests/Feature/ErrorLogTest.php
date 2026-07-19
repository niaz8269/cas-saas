<?php

use App\Models\ErrorLog;
use App\Services\Monitoring\ErrorLogger;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

uses(RefreshDatabase::class);

const MONITOR_PERMS = ['settings.manage.global'];

function errorLogger(): ErrorLogger
{
    return app(ErrorLogger::class);
}

it('records an unhandled exception grouped by fingerprint', function () {
    $e = new RuntimeException('Database exploded');
    errorLogger()->report($e);
    errorLogger()->report($e); // same file/line → same group

    expect(ErrorLog::count())->toBe(1);
    $log = ErrorLog::first();
    expect($log->type)->toBe('RuntimeException')
        ->and($log->message)->toBe('Database exploded')
        ->and($log->occurrences)->toBe(2)
        ->and($log->status)->toBe(500);
});

it('skips expected client, auth and validation-style exceptions', function () {
    errorLogger()->report(new NotFoundHttpException('nope'));   // 404
    errorLogger()->report(new AuthenticationException);
    errorLogger()->report(new HttpException(422, 'invalid'));   // client error

    expect(ErrorLog::count())->toBe(0);
});

it('records a 500-class http exception', function () {
    errorLogger()->report(new HttpException(500, 'Server error'));

    expect(ErrorLog::where('status', 500)->count())->toBe(1);
});

it('re-opens a resolved error when it recurs', function () {
    $e = new RuntimeException('flaky');
    errorLogger()->report($e);
    ErrorLog::query()->update(['resolved_at' => now(), 'resolved_by' => 1]);

    errorLogger()->report($e);

    $log = ErrorLog::first();
    expect($log->resolved_at)->toBeNull()->and($log->occurrences)->toBe(2);
});

it('denies the error monitor without settings.manage', function () {
    actingAsStaffWith(['finance.view.global']);

    $this->getJson('/api/v1/error-logs')
        ->assertStatus(403)
        ->assertJsonPath('code', 'FORBIDDEN');
});

it('lists unresolved errors with stats, exposes the trace, and resolves one', function () {
    actingAsStaffWith(MONITOR_PERMS);
    errorLogger()->report(new RuntimeException('boom'));
    $log = ErrorLog::first();

    $this->getJson('/api/v1/error-logs')->assertOk()
        ->assertJsonPath('data.0.type', 'RuntimeException')
        ->assertJsonPath('stats.unresolved', 1);

    $this->getJson("/api/v1/error-logs/{$log->id}")->assertOk()
        ->assertJsonStructure(['data' => ['context' => ['trace']]]);

    $this->postJson("/api/v1/error-logs/{$log->id}/resolve")->assertOk()
        ->assertJsonPath('data.resolved', true);

    // The default (unresolved) filter now hides it.
    $this->getJson('/api/v1/error-logs')->assertOk()->assertJsonPath('meta.total', 0);
});

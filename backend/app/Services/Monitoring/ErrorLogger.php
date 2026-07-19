<?php

namespace App\Services\Monitoring;

use App\Exceptions\ChecklistIncompleteException;
use App\Models\ErrorLog;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Records unhandled server errors into the error_logs table for the admin
 * monitor. Grouped by fingerprint so recurrences bump a counter (and re-open a
 * resolved error) instead of creating a new row. Never throws — error logging
 * must not itself break a request.
 */
class ErrorLogger
{
    private const TRACE_FRAMES = 30;

    /** Guards we might find an authenticated actor under. */
    private const GUARDS = ['staff', 'agent', 'student', 'web'];

    public function report(Throwable $e, ?Request $request = null): void
    {
        try {
            if (! $this->shouldReport($e)) {
                return;
            }

            $request ??= request();
            $fingerprint = hash('sha256', get_class($e).'|'.$e->getFile().'|'.$e->getLine());

            $attributes = [
                'level' => $this->level($e),
                'type' => class_basename($e),
                'message' => Str::limit($e->getMessage() ?: class_basename($e), 2000, ''),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'url' => $request?->fullUrl(),
                'method' => $request?->method(),
                'status' => $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500,
                'ip' => $request?->ip(),
                'user_agent' => Str::limit((string) $request?->userAgent(), 255, ''),
                'context' => $this->context($e),
                'last_seen_at' => now(),
                ...$this->actor(),
            ];

            $existing = ErrorLog::where('fingerprint', $fingerprint)->first();

            if ($existing !== null) {
                $existing->fill($attributes);
                $existing->occurrences = (int) $existing->occurrences + 1;
                // A recurrence re-opens a previously resolved error.
                $existing->resolved_at = null;
                $existing->resolved_by = null;
                $existing->save();

                return;
            }

            ErrorLog::create([
                ...$attributes,
                'fingerprint' => $fingerprint,
                'occurrences' => 1,
                'first_seen_at' => now(),
            ]);
        } catch (Throwable) {
            // Swallow — never let error logging surface a new error.
        }
    }

    /** Skip expected/business exceptions and all client (< 500) HTTP errors. */
    private function shouldReport(Throwable $e): bool
    {
        return ! (
            $e instanceof ValidationException
            || $e instanceof AuthenticationException
            || $e instanceof AuthorizationException
            || $e instanceof UnauthorizedException
            || $e instanceof ModelNotFoundException
            || $e instanceof ChecklistIncompleteException
            || ($e instanceof HttpExceptionInterface && $e->getStatusCode() < 500)
        );
    }

    private function level(Throwable $e): string
    {
        return $e instanceof \Error ? 'critical' : 'error';
    }

    /**
     * @return array<string, mixed>
     */
    private function context(Throwable $e): array
    {
        $trace = array_slice(
            array_map(
                fn ($frame) => trim(($frame['file'] ?? '[internal]').':'.($frame['line'] ?? '?').' '.($frame['class'] ?? '').($frame['type'] ?? '').($frame['function'] ?? '').'()'),
                $e->getTrace(),
            ),
            0,
            self::TRACE_FRAMES,
        );

        return array_filter([
            'trace' => $trace,
            'previous' => $e->getPrevious() ? class_basename($e->getPrevious()).': '.Str::limit($e->getPrevious()->getMessage(), 500, '') : null,
        ], fn ($v) => $v !== null && $v !== []);
    }

    /**
     * @return array{user_type: string|null, user_id: int|null}
     */
    private function actor(): array
    {
        foreach (self::GUARDS as $guard) {
            if (($id = Auth::guard($guard)->id()) !== null) {
                return ['user_type' => $guard, 'user_id' => (int) $id];
            }
        }

        return ['user_type' => null, 'user_id' => null];
    }
}

<?php

use App\Exceptions\ChecklistIncompleteException;
use App\Http\Middleware\AuthenticateApiSource;
use App\Services\Monitoring\ErrorLogger;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'api-source' => AuthenticateApiSource::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Capture unhandled server errors into the admin error monitor. The
        // logger applies its own skip-list (validation/auth/404/…) and never
        // throws, so default logging still runs.
        $exceptions->report(function (Throwable $e) {
            app(ErrorLogger::class)->report($e);
        });

        // API error envelope per CLAUDE.md: { message, errors, code }.
        $isApi = fn (Request $request): bool => $request->is('api/*') || $request->expectsJson();

        $exceptions->render(function (ValidationException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'errors' => $e->errors(),
                    'code' => 'VALIDATION_ERROR',
                ], $e->status);
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                    'code' => 'UNAUTHENTICATED',
                ], 401);
            }
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json([
                    'message' => 'This action is unauthorized.',
                    'code' => 'FORBIDDEN',
                ], 403);
            }
        });

        $exceptions->render(function (ChecklistIncompleteException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'code' => 'CHECKLIST_INCOMPLETE',
                    'missing' => $e->missing,
                ], 409);
            }
        });

        $exceptions->render(function (UnauthorizedException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json([
                    'message' => 'This action is unauthorized.',
                    'code' => 'FORBIDDEN',
                ], 403);
            }
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                $status = $e->getStatusCode();

                $code = match ($status) {
                    403 => 'FORBIDDEN',
                    404 => 'NOT_FOUND',
                    409 => 'CONFLICT',
                    429 => 'RATE_LIMITED',
                    default => 'HTTP_ERROR',
                };

                return response()->json([
                    'message' => $e->getMessage() ?: 'Request failed.',
                    'code' => $code,
                ], $status, $e->getHeaders());
            }
        });
    })->create();

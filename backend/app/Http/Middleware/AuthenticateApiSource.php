<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates lead-ingestion requests via per-source API keys
 * (X-Api-Key header). Keys are stored hashed, individually revocable,
 * and rate-limited per key (api_keys.rate_limit requests/minute).
 */
class AuthenticateApiSource
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainKey = $request->header('X-Api-Key');

        if (! $plainKey) {
            return response()->json([
                'message' => 'Missing API key.',
                'code' => 'UNAUTHENTICATED',
            ], 401);
        }

        $apiKey = ApiKey::query()
            ->where('key_hash', ApiKey::hashKey($plainKey))
            ->whereNull('revoked_at')
            ->with('apiSource')
            ->first();

        if (! $apiKey || ! $apiKey->apiSource || ! $apiKey->apiSource->is_active) {
            return response()->json([
                'message' => 'Invalid API key.',
                'code' => 'UNAUTHENTICATED',
            ], 401);
        }

        $limiterKey = 'ingest:'.$apiKey->id;

        if (RateLimiter::tooManyAttempts($limiterKey, $apiKey->rate_limit)) {
            return response()->json([
                'message' => 'Too many requests for this source.',
                'code' => 'RATE_LIMITED',
            ], 429, ['Retry-After' => RateLimiter::availableIn($limiterKey)]);
        }

        RateLimiter::hit($limiterKey, 60);

        $request->attributes->set('apiKey', $apiKey);
        $request->attributes->set('apiSource', $apiKey->apiSource);

        return $next($request);
    }
}

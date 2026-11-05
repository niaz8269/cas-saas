<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lets browsers and the CDN reuse public catalog answers for a short time. Only for
 * anonymous GET requests: a signed-in viewer can see different fields (fees), so
 * those answers stay private, and every answer varies on the Authorization header.
 */
class PublicCatalogCache
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->isMethod('GET') && ! $request->hasHeader('Authorization') && $response->getStatusCode() === 200) {
            $response->headers->set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        }
        $response->headers->set('Vary', trim($response->headers->get('Vary', '').', Authorization', ', '));

        return $response;
    }
}

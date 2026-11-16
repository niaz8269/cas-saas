<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Any name in front of the main domain (dalian.cas.moe, sas.cas.moe, www.cas.moe, ...) answers with a permanent
 * redirect to the same path on the main domain, so search engines see one site instead of a copy per subdomain.
 */
class CanonicalHost
{
    public function handle(Request $request, Closure $next): Response
    {
        $main = parse_url((string) config('app.url'), PHP_URL_HOST);
        $host = strtolower($request->getHost());

        if ($main && $host !== $main && str_ends_with($host, '.'.$main)) {
            return redirect()->away(rtrim((string) config('app.url'), '/').$request->getRequestUri(), 301);
        }

        return $next($request);
    }
}

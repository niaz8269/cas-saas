<?php

use App\Http\Controllers\Api\V1\Public\PublicMediaController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\SeoController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Illuminate\View\Middleware\ShareErrorsFromSession;

// Public website: server-rendered <head> and crawlable HTML for every public URL.
// No session or cookies here: a Set-Cookie header makes CDNs skip caching and adds nothing to a public page.
Route::withoutMiddleware([EncryptCookies::class, AddQueuedCookiesToResponse::class, StartSession::class, ShareErrorsFromSession::class, ValidateCsrfToken::class])->group(function () {
    Route::get('/', [SeoController::class, 'shell']);
    Route::get('/robots.txt', [SeoController::class, 'robots']);
    Route::get('/sitemap.xml', [SeoController::class, 'sitemapIndex']);
    Route::get('/sitemaps/{name}.xml', [SeoController::class, 'sitemap']);
    Route::get('/{key}.txt', [SeoController::class, 'indexNowKey'])->where('key', '[A-Za-z0-9]{16,64}');
    Route::get('/site/{path?}', [SeoController::class, 'shell'])->where('path', '.*');
});

// CAS-emblem copy of a site photo (made on first request, then served as a static file)
Route::get('/wm/{folder}/{name}', [PublicMediaController::class, 'watermarked'])->where(['folder' => 'photos|images', 'name' => '[A-Za-z0-9._-]+']);

Route::get('/health', [HealthController::class, 'health']);
Route::get('/ready', [HealthController::class, 'ready']);

// Staff app and portals (single-page app routes): same shell, never indexed.
Route::fallback(function (Request $request) {
    abort_if(str_starts_with($request->path(), 'api/') || ! $request->isMethod('GET'), 404);

    return app(SeoController::class)->shell($request);
});

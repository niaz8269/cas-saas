<?php

namespace App\Services\Seo;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Tells Bing, Yandex and the other IndexNow search engines that a page was added or changed, so new
 * universities, news and guides are picked up within minutes instead of at the next crawl.
 * Google has no such ping: it reads the sitemap, which updates itself (see SeoController).
 * Does nothing unless INDEXNOW_KEY is set.
 */
class IndexNow
{
    /** @param  list<string>  $paths  site paths such as /site/universities/some-slug */
    public function submit(array $paths): void
    {
        $key = config('seo.indexnow_key');
        $site = config('seo.site_url');
        if (! $key || ! $site || $paths === []) {
            return;
        }

        $urls = array_values(array_unique(array_map(fn ($p) => str_starts_with($p, 'http') ? $p : $site.'/'.ltrim($p, '/'), $paths)));

        try {
            Http::timeout(8)->acceptJson()->post('https://api.indexnow.org/indexnow', [
                'host' => parse_url($site, PHP_URL_HOST),
                'key' => $key,
                'keyLocation' => "{$site}/{$key}.txt",
                'urlList' => array_slice($urls, 0, 10000),
            ]);
        } catch (\Throwable $e) {
            Log::notice('IndexNow ping failed: '.$e->getMessage());
        }
    }
}

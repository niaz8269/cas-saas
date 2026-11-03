<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\University;
use App\Services\Media\ImageService;
use App\Services\Seo\SeoPageBuilder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

/**
 * Serves the single-page app shell with the right <head> for each URL (title,
 * description, canonical, Open Graph, structured data) and a crawlable HTML
 * body, plus robots.txt and the XML sitemaps.
 */
class SeoController extends Controller
{
    public function __construct(private readonly SeoPageBuilder $builder, private readonly ImageService $images) {}

    public function shell(Request $request): Response|RedirectResponse
    {
        $path = $request->path();
        $page = $this->builder->build($path === '/' ? '' : $path);

        if (isset($page['redirect'])) {
            return redirect($page['redirect'], 301);
        }

        return response($this->render($page), $page['status'])
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', $page['noindex'] ? 'no-cache' : 'public, max-age=300')
            ->header('X-Robots-Tag', $page['noindex'] ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    }

    public function robots(): Response
    {
        $site = config('seo.site_url');
        $lines = [
            'User-agent: *',
            'Allow: /',
            'Disallow: /api/',
            'Disallow: /admin',
            'Disallow: /dashboard',
            'Disallow: /portal',
            'Disallow: /login',
            '',
            "Sitemap: {$site}/sitemap.xml",
        ];

        return response(implode("\n", $lines)."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    public function sitemapIndex(): Response
    {
        $site = config('seo.site_url');
        $xml = '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach (['pages', 'universities', 'cities', 'news'] as $name) {
            $xml .= "<sitemap><loc>{$site}/sitemaps/{$name}.xml</loc><lastmod>".now()->toDateString().'</lastmod></sitemap>';
        }

        return $this->xml($xml.'</sitemapindex>');
    }

    public function sitemap(string $name): Response
    {
        $site = config('seo.site_url');
        $urls = [];

        switch ($name) {
            case 'pages':
                foreach (config('seo.pages') as $path => [, , $priority, $freq]) {
                    $urls[] = ['loc' => $site.($path === '' ? '/' : '/'.$path), 'changefreq' => $freq, 'priority' => $priority];
                }
                break;
            case 'universities':
                foreach (University::where('status', 'active')->orderBy('name')->get(['slug', 'name', 'cover_path', 'updated_at']) as $u) {
                    $img = $this->images->url($u->cover_path);
                    $urls[] = ['loc' => $site.'/site/universities/'.$u->slug, 'lastmod' => $u->updated_at?->toDateString(), 'changefreq' => 'weekly', 'priority' => 0.8, 'image' => $img ? (preg_match('#^https?://#', $img) ? $img : $site.$img) : null, 'title' => $u->name];
                }
                break;
            case 'cities':
                foreach (University::where('status', 'active')->whereNotNull('city')->pluck('city')->unique()->sort() as $city) {
                    $urls[] = ['loc' => $site.'/site/cities/'.Str::slug($city), 'changefreq' => 'monthly', 'priority' => 0.6];
                }
                break;
            case 'news':
                foreach (Post::where('status', 'published')->orderByDesc('published_at')->get(['slug', 'updated_at']) as $p) {
                    $urls[] = ['loc' => $site.'/site/news/'.$p->slug, 'lastmod' => $p->updated_at?->toDateString(), 'changefreq' => 'monthly', 'priority' => 0.6];
                }
                break;
            default:
                abort(404);
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';
        foreach ($urls as $u) {
            $xml .= '<url><loc>'.e($u['loc']).'</loc>';
            if (! empty($u['lastmod'])) {
                $xml .= '<lastmod>'.$u['lastmod'].'</lastmod>';
            }
            $xml .= '<changefreq>'.$u['changefreq'].'</changefreq><priority>'.number_format((float) $u['priority'], 1).'</priority>';
            if (! empty($u['image'])) {
                $xml .= '<image:image><image:loc>'.e($u['image']).'</image:loc><image:title>'.e($u['title']).'</image:title></image:image>';
            }
            $xml .= '</url>';
        }

        return $this->xml($xml.'</urlset>');
    }

    public function indexNowKey(string $key): Response
    {
        abort_unless(config('seo.indexnow_key') && hash_equals((string) config('seo.indexnow_key'), $key), 404);

        return response($key, 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    // ---------------------------------------------------------------- helpers

    private function xml(string $xml): Response
    {
        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8', 'Cache-Control' => 'public, max-age=3600']);
    }

    /** @param array<string, mixed> $p */
    private function render(array $p): string
    {
        $index = config('seo.index_path');
        $html = is_file($index) ? (string) file_get_contents($index) : '<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head><body><div id="root"></div></body></html>';

        // Drop the generic head tags of the shell; the page-specific ones follow.
        $html = preg_replace('#<title>.*?</title>#is', '', $html);
        $html = preg_replace('#<meta\s+name="description"[^>]*>#is', '', $html);
        $html = preg_replace('#<meta\s+(?:property|name)="(?:og|twitter):[^"]*"[^>]*>#is', '', $html);

        $t = e($p['title']);
        $d = $p['description'] ? e($p['description']) : null;
        $head = "<title>{$t}</title>\n";
        if ($d) {
            $head .= "<meta name=\"description\" content=\"{$d}\" />\n";
        }
        $head .= '<meta name="robots" content="'.($p['noindex'] ? 'noindex, nofollow' : 'index, follow, max-image-preview:large').'" />'."\n";
        $head .= '<link rel="canonical" href="'.e($p['canonical']).'" />'."\n";
        $head .= '<meta property="og:site_name" content="'.e(config('seo.site_name')).'" />'."\n";
        $head .= '<meta property="og:type" content="'.e($p['type']).'" />'."\n";
        $head .= "<meta property=\"og:title\" content=\"{$t}\" />\n";
        if ($d) {
            $head .= "<meta property=\"og:description\" content=\"{$d}\" />\n";
        }
        $head .= '<meta property="og:url" content="'.e($p['canonical']).'" />'."\n";
        $head .= '<meta property="og:image" content="'.e($p['image']).'" />'."\n";
        $head .= '<meta name="twitter:card" content="summary_large_image" />'."\n";
        $head .= "<meta name=\"twitter:title\" content=\"{$t}\" />\n";
        if ($d) {
            $head .= "<meta name=\"twitter:description\" content=\"{$d}\" />\n";
        }
        $head .= '<meta name="twitter:image" content="'.e($p['image']).'" />'."\n";
        foreach ($p['jsonLd'] as $ld) {
            $head .= '<script type="application/ld+json">'.json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG).'</script>'."\n";
        }

        $html = preg_replace('#</head>#i', $head.'</head>', $html, 1);
        // Crawlable content; the app replaces it as soon as it loads.
        $html = str_replace('<div id="root"></div>', '<div id="root"><main style="max-width:56rem;margin:0 auto;padding:1.5rem;font-family:system-ui,sans-serif;line-height:1.55">'.$p['body'].'</main></div>', $html);

        return $html;
    }
}

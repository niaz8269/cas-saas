<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\University;
use App\Services\Media\ImageService;
use App\Services\Seo\SeoIndexability;
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
            ->header('X-Robots-Tag', $page['noindex'] ? (($page['follow'] ?? false) ? 'noindex, follow' : 'noindex, nofollow') : 'index, follow, max-image-preview:large');
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
            'Disallow: /wm/',
            '',
            "Sitemap: {$site}/sitemap.xml",
        ];

        return response(implode("\n", $lines)."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    public function sitemapIndex(): Response
    {
        $site = config('seo.site_url');
        $stamp = fn (?string $d) => $d ?: now()->toDateString();
        $lastmod = [
            'pages' => $stamp(date('Y-m-d', (int) filemtime(config_path('seo.php')))),
            'universities' => $stamp(University::where('status', 'active')->max('updated_at') ? substr((string) University::where('status', 'active')->max('updated_at'), 0, 10) : null),
            'cities' => $stamp(University::where('status', 'active')->max('updated_at') ? substr((string) University::where('status', 'active')->max('updated_at'), 0, 10) : null),
            'news' => $stamp(Post::where('status', 'published')->max('updated_at') ? substr((string) Post::where('status', 'published')->max('updated_at'), 0, 10) : null),
        ];

        $xml = '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach ($lastmod as $name => $date) {
            $xml .= "<sitemap><loc>{$site}/sitemaps/{$name}.xml</loc><lastmod>{$date}</lastmod></sitemap>";
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
                // Every active institution. Those with confirmed programs or a full profile rank higher
                // than the ones that so far only list the Ministry's registered majors.
                $rows = University::where('status', 'active')
                    ->withCount(['programs as confirmed_programs_count' => fn ($q) => $q->where('status', 'active')->where('registry_only', false)])
                    ->withExists('intakes as has_intakes')
                    ->orderBy('name')
                    ->get(['id', 'slug', 'name', 'cover_path', 'overview', 'moe_listed', 'updated_at'])
                    ->filter(fn ($u) => SeoIndexability::universityHasSubstance($u, (int) $u->confirmed_programs_count, (bool) $u->has_intakes));
                foreach ($rows as $u) {
                    $img = $this->images->url($u->cover_path);
                    $rich = true;
                    $urls[] = ['loc' => $site.'/site/universities/'.$u->slug, 'lastmod' => $u->updated_at?->toDateString(), 'changefreq' => $rich ? 'weekly' : 'monthly', 'priority' => $rich ? 0.8 : 0.5, 'image' => $img ? (preg_match('#^https?://#', $img) ? $img : $site.$img) : null, 'title' => $u->name];
                }
                break;
            case 'cities':
                $latest = University::where('status', 'active')->whereNotNull('city')->selectRaw('city, max(updated_at) as updated')->groupBy('city')->orderBy('city')->get();
                foreach ($latest as $row) {
                    $urls[] = ['loc' => $site.'/site/cities/'.Str::slug($row->city), 'lastmod' => $row->updated ? substr((string) $row->updated, 0, 10) : null, 'changefreq' => 'monthly', 'priority' => 0.6];
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
        $head .= '<meta name="robots" content="'.($p['noindex'] ? (($p['follow'] ?? false) ? 'noindex, follow' : 'noindex, nofollow') : 'index, follow, max-image-preview:large').'" />'."\n";
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

        if (($p['canonical'] ?? '') === rtrim((string) config('seo.site_url'), '/').'/') {
            // The home page's first screen is its hero photo: start fetching it before the script runs.
            $head .= '<link rel="preload" as="image" fetchpriority="high" imagesrcset="/images/hero-beijing-800-v2.webp 800w, /images/hero-beijing-1400-v2.webp 1400w, /images/hero-beijing-v2.webp 2000w" imagesizes="100vw" />'.'
';
        }

        $html = preg_replace('#</head>#i', $head.'</head>', $html, 1);
        // Crawlable content for search engines and no-JS visitors, kept out of sight for people while the
        // app loads: they see a branded loading screen instead of bare text. The app replaces all of it on mount.
        $splash = '<style>#cas-splash{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#f6f8fc}'
            .'#cas-splash img{width:88px;height:auto;animation:casPulse 1.4s ease-in-out infinite}'
            .'@keyframes casPulse{0%,100%{opacity:.45}50%{opacity:1}}'
            .'#cas-seo{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}</style>'
            .'<noscript><style>#cas-splash{display:none}#cas-seo{position:static;width:auto;height:auto;overflow:visible;clip:auto;white-space:normal}</style></noscript>'
            .'<div id="cas-splash" aria-hidden="true"><img src="/cas-emblem.png" alt="" /></div>';
        $html = str_replace('<div id="root"></div>', '<div id="root">'.$splash.'<main id="cas-seo" style="max-width:56rem;margin:0 auto;padding:1.5rem;font-family:system-ui,sans-serif;line-height:1.55">'.$p['body'].'</main></div>', $html);

        return $html;
    }
}

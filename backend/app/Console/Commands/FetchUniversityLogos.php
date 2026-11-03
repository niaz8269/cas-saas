<?php

namespace App\Console\Commands;

use App\Models\University;
use Illuminate\Console\Command;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

/**
 * Looks at each university's own website for its logo and seal and downloads
 * the candidates to storage/app/logo-fetch/<slug>/ for review. Nothing is
 * published by this command: a person (or a reviewed script) picks from the
 * candidates afterwards.
 */
class FetchUniversityLogos extends Command
{
    protected $signature = 'catalog:fetch-logos {--only=* : slugs to limit the run}';

    protected $description = 'Download logo candidates from university websites';

    private const UA = 'Mozilla/5.0 (compatible; CASCatalogBot/1.0; webai.auto@gmail.com)';

    public function handle(): int
    {
        $base = storage_path('app/logo-fetch');
        File::ensureDirectoryExists($base);

        $query = University::query()->whereNotNull('website')->where('website', '!=', '');
        if ($this->option('only')) {
            $query->whereIn('slug', $this->option('only'));
        }
        $universities = $query->get(['id', 'slug', 'website']);

        foreach ($universities->chunk(12) as $chunk) {
            $pages = Http::pool(fn (Pool $pool) => $chunk->map(
                fn ($u) => $pool->as($u->slug)->withUserAgent(self::UA)->timeout(20)->get($this->url($u->website))
            )->all());

            foreach ($chunk as $u) {
                $page = $pages[$u->slug] ?? null;
                if (! $page instanceof Response || ! $page->successful()) {
                    $this->line("{$u->slug}: page unreachable");

                    continue;
                }

                $candidates = $this->candidates($page->body(), $page->effectiveUri()?->__toString() ?? $this->url($u->website));
                $dir = "{$base}/{$u->slug}";
                File::ensureDirectoryExists($dir);
                $saved = 0;

                foreach (array_slice($candidates, 0, 4) as $i => [$kind, $src]) {
                    try {
                        $img = Http::withUserAgent(self::UA)->timeout(15)->get($src);
                    } catch (\Throwable) {
                        continue;
                    }
                    if (! $img->successful() || strlen($img->body()) < 1500) {
                        continue;
                    }
                    $type = $img->header('Content-Type');
                    if (! str_starts_with((string) $type, 'image/') && ! str_ends_with($src, '.svg')) {
                        continue;
                    }
                    $ext = match (true) {
                        str_contains((string) $type, 'svg') => 'svg',
                        str_contains((string) $type, 'png') => 'png',
                        str_contains((string) $type, 'jpeg') => 'jpg',
                        str_contains((string) $type, 'gif') => 'gif',
                        str_contains((string) $type, 'webp') => 'webp',
                        str_contains((string) $type, 'icon') => 'ico',
                        default => pathinfo(parse_url($src, PHP_URL_PATH) ?: '', PATHINFO_EXTENSION) ?: 'bin',
                    };
                    file_put_contents("{$dir}/{$i}-{$kind}.{$ext}", $img->body());
                    file_put_contents("{$dir}/{$i}-{$kind}.url", $src);
                    $saved++;
                }

                $this->line("{$u->slug}: {$saved} candidate(s)");
            }
        }

        return self::SUCCESS;
    }

    private function url(string $website): string
    {
        return preg_match('#^https?://#i', $website) ? $website : 'http://'.$website;
    }

    /**
     * @return list<array{string, string}> [kind, absolute url], best first
     */
    private function candidates(string $html, string $pageUrl): array
    {
        $out = [];
        $seen = [];
        $add = function (string $kind, ?string $src) use (&$out, &$seen, $pageUrl) {
            if (! $src || str_starts_with($src, 'data:')) {
                return;
            }
            $abs = $this->absolute($src, $pageUrl);
            if ($abs && ! isset($seen[$abs])) {
                $seen[$abs] = true;
                $out[] = [$kind, $abs];
            }
        };

        // <img> tags that look like a logo or seal.
        if (preg_match_all('/<img\b[^>]*>/i', $html, $tags)) {
            foreach ($tags[0] as $tag) {
                if (! preg_match('/(logo|badge|emblem|xiaohui|校徽|logo)/iu', $tag)) {
                    continue;
                }
                if (preg_match('/\bsrc\s*=\s*["\']([^"\']+)["\']/i', $tag, $m)) {
                    $add('logo', html_entity_decode($m[1]));
                }
            }
        }

        // Icons (often the seal itself, square).
        if (preg_match_all('/<link\b[^>]*rel\s*=\s*["\'][^"\']*(apple-touch-icon|icon)[^"\']*["\'][^>]*>/i', $html, $links)) {
            foreach ($links[0] as $tag) {
                if (preg_match('/\bhref\s*=\s*["\']([^"\']+)["\']/i', $tag, $m)) {
                    $add('icon', html_entity_decode($m[1]));
                }
            }
        }

        return $out;
    }

    private function absolute(string $src, string $base): ?string
    {
        if (preg_match('#^https?://#i', $src)) {
            return $src;
        }
        $p = parse_url($base);
        if (! $p || empty($p['host'])) {
            return null;
        }
        $origin = ($p['scheme'] ?? 'http').'://'.$p['host'].(isset($p['port']) ? ':'.$p['port'] : '');
        if (str_starts_with($src, '//')) {
            return ($p['scheme'] ?? 'http').':'.$src;
        }
        if (str_starts_with($src, '/')) {
            return $origin.$src;
        }
        $dir = rtrim(dirname($p['path'] ?? '/'), '/');

        return $origin.$dir.'/'.$src;
    }
}

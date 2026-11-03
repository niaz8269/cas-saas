<?php

namespace App\Console\Commands;

use App\Models\University;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Collects candidate campus photos for each university from the images on its
 * English and Chinese Wikipedia articles (files hosted on Wikimedia Commons),
 * keeps only freely licensed, large JPEG/PNG files, and scores them by how much
 * the file name looks like a campus view. Writes storage/app/campus-candidates.json
 * for review; nothing is published by this command.
 */
class FindCampusPhotos extends Command
{
    protected $signature = 'catalog:find-campus-photos {--only=* : slugs to limit the run}';

    protected $description = 'Find candidate campus photos from Wikipedia articles';

    private const UA = 'CASCatalogBot/1.0 (webai.auto@gmail.com)';

    private const BAD = '/logo|emblem|seal|badge|crest|map|flag|coat|symbol|wordmark|icon|portrait|president|professor|signature|chart|diagram|ranking|commons-|wikisource|ambox|question|logotype|poster|ceremony|festival|team|competition|match|certificate|diploma|stamp|校徽|地图|标志|标识|校旗|logo|毕业|证书|院士|校长|书记|海报|比赛|晚会|截图|示意|位置图|区位|分布/iu';

    private const GOOD = '/campus|gate|library|building|hall|lake|view|tower|entrance|main|front|facade|college|school|university|academy|institute|panorama|aerial|square|校门|校园|大门|图书馆|主楼|教学楼|行政楼|全景|航拍|校区|大学|学院|体育馆|湖|广场|礼堂|实验楼/iu';

    public function handle(): int
    {
        $query = University::query()->orderBy('name');
        if ($this->option('only')) {
            $query->whereIn('slug', $this->option('only'));
        }

        $out = [];
        foreach ($query->get(['id', 'slug', 'name', 'name_zh', 'wikipedia_url']) as $u) {
            $files = [];
            $enTitle = $u->wikipedia_url ? urldecode(basename(parse_url($u->wikipedia_url, PHP_URL_PATH))) : $u->name;
            foreach ($this->images('en', $enTitle) as $f) {
                $files['en'][] = $f;
            }
            if ($u->name_zh) {
                foreach ($this->images('zh', $u->name_zh) as $f) {
                    $files['zh'][] = $f;
                }
            }

            $cands = [];
            foreach ($files as $lang => $titles) {
                $titles = array_values(array_unique(array_filter($titles, fn ($t) => preg_match('/\.(jpe?g|png)$/i', $t) && ! preg_match(self::BAD, $t))));
                foreach (array_chunk($titles, 40) as $chunk) {
                    foreach ($this->imageInfo($lang, $chunk) as $c) {
                        $cands[$c['file']] = $c;
                    }
                }
            }

            $scored = collect($cands)
                ->filter(fn ($c) => $c['w'] >= 1000 && $c['w'] / max($c['h'], 1) >= 1.15 && $c['w'] / max($c['h'], 1) <= 2.6)
                ->map(function ($c) {
                    $c['score'] = (preg_match(self::GOOD, $c['file']) ? 3 : 0) + min($c['w'] / 2000, 2);

                    return $c;
                })
                ->sortByDesc('score')
                ->values()
                ->take(8)
                ->all();

            $out[$u->slug] = $scored;
            $this->line(sprintf('%-60s %d candidates', $u->slug, count($scored)));
        }

        file_put_contents(storage_path('app/campus-candidates.json'), json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return self::SUCCESS;
    }

    /** @return list<string> */
    private function images(string $lang, string $title): array
    {
        $titles = [];
        $params = ['action' => 'query', 'prop' => 'images', 'imlimit' => 'max', 'redirects' => 1, 'converttitles' => 1, 'format' => 'json', 'titles' => $title];
        for ($page = 0; $page < 6; $page++) {
            $r = $this->get($lang, $params);
            foreach (($r['query']['pages'] ?? []) as $p) {
                foreach (($p['images'] ?? []) as $img) {
                    $titles[] = $img['title'];
                }
            }
            if (empty($r['continue']['imcontinue'])) {
                break;
            }
            $params['imcontinue'] = $r['continue']['imcontinue'];
            if (! empty($r['continue']['continue'])) {
                $params['continue'] = $r['continue']['continue'];
            }
        }

        return $titles;
    }

    /** @return list<array<string, mixed>> */
    private function imageInfo(string $lang, array $titles): array
    {
        $r = $this->get($lang, ['action' => 'query', 'prop' => 'imageinfo', 'iiprop' => 'url|size|mime|extmetadata', 'iiurlwidth' => 960, 'iiextmetadatafilter' => 'LicenseShortName|NonFree|Artist', 'format' => 'json', 'titles' => implode('|', $titles)]);
        $out = [];
        foreach (($r['query']['pages'] ?? []) as $p) {
            $ii = $p['imageinfo'][0] ?? null;
            if (! $ii) {
                continue;
            }
            $m = $ii['extmetadata'] ?? [];
            $license = $m['LicenseShortName']['value'] ?? '';
            if (! empty($m['NonFree']['value']) || ! preg_match('/^(CC|PD|Public|GFDL)/i', $license)) {
                continue;
            }
            $out[] = [
                'file' => preg_replace('/^[^:]+:/u', '', $p['title']),
                'w' => (int) $ii['width'],
                'h' => (int) $ii['height'],
                'thumb' => $ii['thumburl'] ?? $ii['url'],
                'url' => $ii['url'],
                'license' => $license,
                'author' => trim(preg_replace('/\s+/', ' ', strip_tags($m['Artist']['value'] ?? ''))),
                'page' => $ii['descriptionurl'] ?? null,
            ];
        }

        return $out;
    }

    /** @return array<string, mixed> */
    private function get(string $lang, array $params): array
    {
        for ($try = 0; $try < 3; $try++) {
            try {
                $r = Http::withUserAgent(self::UA)->timeout(45)->get("https://{$lang}.wikipedia.org/w/api.php", $params);
                usleep(200_000);
                if ($r->successful()) {
                    return $r->json() ?? [];
                }
            } catch (\Throwable) {
                sleep(2);
            }
        }

        return [];
    }
}

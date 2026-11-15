<?php

namespace App\Console\Commands;

use App\Models\CityProfile;
use App\Models\University;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Builds what the city pages say about each city (history, places to visit, geography and climate, economy, culture,
 * education, transport) from the city's English Wikipedia article (CC BY-SA 4.0, credited on the page). Nothing is
 * invented: a city whose article is missing or ambiguous gets nothing, and is listed at the end.
 */
class BuildCityProfiles extends Command
{
    protected $signature = 'catalog:build-city-profiles {--only=* : city names to limit the run}';

    protected $description = 'Fetch the city profile text for every city that has a university';

    private const UA = 'CASCatalogBot/1.0 (webai.auto@gmail.com)';

    /** Wikipedia article titles where the plain city name is not the right article. */
    private const TITLES = [
        'Huangshan' => 'Huangshan City', 'Dali' => 'Dali City', 'Yangling' => 'Yangling District', 'Wuyishan' => 'Wuyishan City',
        'Jilin City' => 'Jilin City', 'Jilin' => 'Jilin City',
    ];

    /** Top-level article sections to keep, and the group each belongs to on the page. */
    private const GROUPS = [
        'history' => 'history', 'early history' => 'history', 'modern history' => 'history',
        'sights' => 'places', 'landmarks' => 'places', 'tourism' => 'places', 'attractions' => 'places', 'cityscape' => 'places',
        'parks' => 'places', 'historic sites' => 'places', 'historical sites' => 'places', 'places of interest' => 'places', 'architecture' => 'places',
        'geography' => 'geography', 'climate' => 'geography', 'administrative divisions' => 'geography',
        'economy' => 'economy',
        'culture' => 'culture', 'cuisine' => 'culture', 'festivals' => 'culture', 'religion' => 'culture', 'sports' => 'culture', 'media' => 'culture',
        'education' => 'education',
        'transport' => 'transport', 'transportation' => 'transport',
        'demographics' => 'people',
    ];

    public function handle(): int
    {
        $cities = University::query()->where('status', 'active')->whereNotNull('city')->where('city', '!=', '')
            ->get(['city', 'province'])->groupBy('city');
        if ($this->option('only')) {
            $cities = $cities->only($this->option('only'));
        }

        $skipped = [];
        foreach ($cities as $city => $rows) {
            $title = self::TITLES[$city] ?? $city;
            $text = $this->extract($title);
            if ($text === '' || preg_match('/may refer to|may also refer to/i', Str::limit($text, 400, ''))) {
                $skipped[] = $city;
                $this->warn("skipped {$city} (no article or ambiguous)");

                continue;
            }

            [$summary, $sections] = $this->parse($text);
            CityProfile::updateOrCreate(['slug' => Str::slug($city)], [
                'city' => $city,
                'province' => $rows->first()->province,
                'summary' => $summary,
                'sections' => $sections,
                'source_url' => 'https://en.wikipedia.org/wiki/'.rawurlencode(str_replace(' ', '_', $title)),
            ]);
            $this->line(sprintf('%s: %d sections', $city, count($sections)));
        }

        $this->info('Done.'.($skipped ? ' Skipped: '.implode(', ', $skipped) : ''));

        return self::SUCCESS;
    }

    /** @return array{0: string, 1: list<array<string, mixed>>} */
    private function parse(string $text): array
    {
        $summary = [];
        $sections = [];
        $group = null;
        $index = null;
        $inLead = true;

        foreach (preg_split('/\R/u', $text) as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            if (preg_match('/^(={2,4})\s*(.+?)\s*\1$/', $line, $m)) {
                $inLead = false;
                $level = min(strlen($m[1]), 3);
                if ($level === 2) {
                    $group = $this->groupFor($m[2]);
                }
                if ($group) {
                    $sections[] = ['group' => $group, 'h' => $m[2], 'level' => $level, 'blocks' => []];
                    $index = array_key_last($sections);
                } else {
                    $index = null;
                }

                continue;
            }
            if ($inLead) {
                $summary[] = $line;

                continue;
            }
            if ($index !== null) {
                $short = mb_strlen($line) < 70 && ! preg_match('/[.!?]$/u', $line);
                $sections[$index]['blocks'][] = ['t' => $short ? 'li' : 'p', 'x' => $line];
            }
        }

        $sections = array_values(array_filter($sections, fn ($s) => $s['blocks'] !== []));

        return [implode("\n\n", array_slice($summary, 0, 3)), $sections];
    }

    /** The page group for a top-level heading: an exact match, or one that starts with it ("Education and research"). */
    private function groupFor(string $heading): ?string
    {
        $h = strtolower(trim($heading));
        foreach (self::GROUPS as $key => $group) {
            if ($h === $key || str_starts_with($h, $key.' ')) {
                return $group;
            }
        }

        return null;
    }

    private function extract(string $title): string
    {
        for ($try = 0; $try < 3; $try++) {
            try {
                $r = Http::withUserAgent(self::UA)->timeout(45)->get('https://en.wikipedia.org/w/api.php', [
                    'action' => 'query', 'prop' => 'extracts', 'explaintext' => 1, 'exsectionformat' => 'wiki',
                    'redirects' => 1, 'format' => 'json', 'titles' => $title,
                ]);
                if ($r->successful()) {
                    $page = collect($r->json('query.pages') ?? [])->first();
                    usleep(250_000);

                    return $page['extract'] ?? '';
                }
            } catch (\Throwable) {
                sleep(2);
            }
        }

        return '';
    }
}

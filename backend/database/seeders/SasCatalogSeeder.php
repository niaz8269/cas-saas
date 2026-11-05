<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\University;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Chinese universities and their programs from CAS's own SAS platform
 * (sas.cas.moe), which mirrors the official study-in-China (CSC) listing.
 *
 * Runs after VerifiedCatalogSeeder and never overwrites it: hand-verified
 * universities keep their official-page rows; SAS only adds the Chinese
 * name, province, guide content and any program they don't already have.
 * Programs from the earlier direct CSC scrape for a university are replaced,
 * since SAS carries the same data with Chinese names and the CSC flag.
 *
 * Source: database/data/sas_china_universities.json (exported from SAS).
 * Idempotent: SAS-sourced programs are deleted and re-inserted on every run.
 */
class SasCatalogSeeder extends Seeder
{
    private const PUBLIC = ['public', 'student', 'agent', 'counselor'];

    private const LEVELS = [
        'Bachelor' => 'bachelor',
        "Master's" => 'master',
        'Doctorate' => 'phd',
        'Non-degree' => 'non_degree',
    ];

    public function run(): void
    {
        $path = database_path('data/sas_china_universities.json');
        if (! is_file($path)) {
            $this->command?->warn('sas_china_universities.json not found; skipping SAS import.');

            return;
        }

        // The export holds ~56k program rows; decoding it needs more than the 128M default.
        ini_set('memory_limit', '768M');

        $file = json_decode(file_get_contents($path), true);
        $fetched = substr($file['fetched'] ?? now()->toIso8601String(), 0, 10);
        $cn = Country::where('iso2', 'CN')->first();

        $sitesPath = database_path('data/university_websites.json');
        $sites = is_file($sitesPath) ? (json_decode(file_get_contents($sitesPath), true)['websites'] ?? []) : [];

        $logosPath = database_path('data/university_logos.json');
        $logos = is_file($logosPath) ? (json_decode(file_get_contents($logosPath), true)['logos'] ?? []) : [];

        $coversPath = database_path('data/university_covers.json');
        $covers = is_file($coversPath) ? (json_decode(file_get_contents($coversPath), true)['covers'] ?? []) : [];

        $existing = University::withTrashed()->get(['id', 'name', 'slug', 'code']);
        $bySlug = $existing->keyBy('slug');
        $byName = $existing->keyBy(fn ($u) => $this->norm($u->name));
        $codes = $existing->pluck('code')->flip();

        foreach ($file['universities'] as $row) {
            [$city, $province] = $this->location($row['location'] ?? '');
            $name = $row['name'];
            [$nameEn, $nameZh] = [$name, $this->chineseName($row['header'] ?? '', $name)];
            $url = $row['url'];

            $uni = $bySlug->get($row['slug']) ?? $byName->get($this->norm($name));
            $guide = $this->guide($row['editorial'] ?? null);
            $about = $this->aboutFrom($row['editorial'] ?? null);

            if ($uni) {
                $uni->forceFill(array_filter([
                    'name_zh' => $nameZh,
                    'province' => $province,
                    'guide' => $guide,
                ], fn ($v) => $v !== null && $v !== ''))->save();
                if ($about && ! $uni->about) {
                    $uni->forceFill(['about' => $about])->save();
                }
            } else {
                $code = $this->uniqueCode($row['slug'], $codes);
                $uni = University::create([
                    'name' => $nameEn,
                    'name_zh' => $nameZh,
                    'code' => $code,
                    'slug' => $row['slug'],
                    'country_id' => $cn?->id,
                    'city' => $city,
                    'province' => $province,
                    'about' => $about,
                    'guide' => $guide,
                    'moe_listed' => false,
                    'visibility' => ['deadlines' => self::PUBLIC],
                    'status' => 'active',
                ]);
                $bySlug->put($uni->slug, $uni);
                $codes->put($code, true);
            }

            // Official website (Wikidata P856) where the university has none yet.
            if (! $uni->website && isset($sites[$uni->slug])) {
                $uni->forceFill(['website' => $sites[$uni->slug]])->save();
            }

            // Logo from Wikimedia Commons where the university has none yet.
            if (! $uni->logo_path && isset($logos[$uni->slug])) {
                $uni->forceFill(['logo_path' => $logos[$uni->slug]])->save();
            }

            // Campus photo from Wikimedia Commons with its credit, unless a cover was set by hand.
            $cover = $covers[$uni->slug] ?? null;
            $ownCover = $uni->cover_path && ! str_contains((string) $uni->cover_path, 'commons.wikimedia.org');
            if ($cover && ! $ownCover) {
                $uni->forceFill([
                    'cover_path' => $cover['url'],
                    'cover_credit' => $cover['credit'],
                    'cover_source_url' => $cover['page'],
                ])->save();
            }

            $this->importPrograms($uni, $row['rows'], $url, $fetched);
        }
    }

    /**
     * @param  list<array<int, mixed>>  $rows  [name, name_zh, csc, level, language, years, tuition]
     */
    private function importPrograms(University $uni, array $rows, string $url, string $fetched): void
    {
        // Majors only registered with the Ministry come back from RegisteredMajorsSeeder; they must not displace real programs.
        DB::table('programs')->where('university_id', $uni->id)->where('registry_only', true)->delete();

        // Drop earlier CSC/SAS-sourced rows; keep hand-verified official-page rows.
        DB::table('programs')
            ->where('university_id', $uni->id)
            ->where(fn ($q) => $q->where('source_url', 'like', '%campuschina.org%')->orWhere('source_url', 'like', '%sas.cas.moe%'))
            ->delete();

        $have = DB::table('programs')->where('university_id', $uni->id)->whereNull('deleted_at')
            ->get(['name', 'level'])
            ->mapWithKeys(fn ($p) => [Str::lower($p->name).'|'.$p->level => true]);

        $now = now();
        $visibility = json_encode(['tuition_fee' => self::PUBLIC]);
        $batch = [];

        foreach ($rows as [$name, $zh, $csc, $level, $language, $years, $tuition]) {
            $level = self::LEVELS[$level] ?? Str::snake($level);
            $key = Str::lower($name).'|'.$level.'|'.$language;
            if ($have->has($key) || $have->has(Str::lower($name).'|'.$level)) {
                continue;
            }
            $have->put($key, true);

            $batch[] = [
                'university_id' => $uni->id,
                'name' => Str::limit($name, 190, ''),
                'name_zh' => $zh !== '' ? Str::limit($zh, 190, '') : null,
                'level' => $level,
                'csc_listed' => (bool) $csc,
                'teaching_language' => $language !== '' ? $language : null,
                'duration_months' => is_numeric($years) ? (int) round(((float) $years) * 12) : null,
                'tuition_fee' => is_numeric($tuition) && (float) $tuition > 0 ? $tuition : null,
                'currency' => 'CNY',
                'source_url' => $url,
                'verified_on' => $fetched,
                'visibility' => $visibility,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($batch, 500) as $chunk) {
            DB::table('programs')->insert($chunk);
        }
    }

    /** "Dalian, Liaoning" → [Dalian, Liaoning]. */
    private function location(string $loc): array
    {
        $parts = array_map('trim', explode(',', $loc));
        $city = $parts[0] ?: null;
        // Municipalities are their own province-level division.
        $province = $parts[1] ?? (in_array($city, ['Beijing', 'Shanghai', 'Tianjin', 'Chongqing'], true) ? $city : null);

        return [$city, $province];
    }

    private function chineseName(string $header, string $name): ?string
    {
        $rest = trim(Str::after($header, $name));
        // Chinese characters and CJK punctuation only — stop before any Latin text.
        if (preg_match('/^([\x{3400}-\x{9FFF}][\x{3400}-\x{9FFF}\x{FF08}\x{FF09}\x{00B7}\x{3001}()\-]*)/u', $rest, $m)) {
            return trim($m[1]);
        }

        return null;
    }

    /** Curated sections from SAS become the university's guide tab. */
    private function guide(?array $editorial): ?array
    {
        if (! $editorial || empty($editorial['blocks'])) {
            return null;
        }

        $blocks = array_values(array_filter(array_map(fn ($b) => [
            'h' => $b['h'] ?? '',
            't' => array_values(array_filter($b['t'] ?? [])),
        ], $editorial['blocks']), fn ($b) => $b['h'] !== '' || $b['t'] !== []));

        return ['blocks' => $blocks, 'links' => $editorial['links'] ?? []];
    }

    /** First long paragraph under "The university", if the guide has one. */
    private function aboutFrom(?array $editorial): ?string
    {
        foreach ($editorial['blocks'] ?? [] as $b) {
            if (($b['h'] ?? '') === 'The university') {
                foreach ($b['t'] ?? [] as $line) {
                    if (mb_strlen($line) > 120 && ! str_starts_with($line, 'TABLE:') && ! str_starts_with($line, 'Location')) {
                        return $line;
                    }
                }
            }
        }

        return null;
    }

    private function uniqueCode(string $slug, $taken): string
    {
        $base = Str::upper(Str::limit(preg_replace('/[^A-Za-z0-9]/', '', $slug), 30, ''));
        $code = $base;
        $i = 2;
        while ($taken->has($code)) {
            $code = Str::limit($base, 35, '').$i++;
        }

        return $code;
    }

    private function norm(string $s): string
    {
        return preg_replace('/[^a-z0-9]/', '', Str::lower(str_replace('&', 'and', $s)));
    }
}

<?php

namespace App\Console\Commands;

use App\Models\Intake;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Builds the long, sectioned Overview text for each university from real
 * sources only: the English Wikipedia article (CC BY-SA, credited on the Photo
 * credits page), the Wikipedia article of its city, and the catalog's own
 * programs, application windows and scholarships. Nothing is invented; a
 * university with a short article simply gets a shorter overview.
 *
 * Section format stored in universities.overview:
 *   [{"h": "History", "level": 2, "blocks": [{"t": "p"|"li", "x": "text"}]}]
 */
class BuildUniversityOverviews extends Command
{
    protected $signature = 'catalog:build-overviews {--only=* : slugs to limit the run} {--stats : only print word counts}';

    protected $description = 'Assemble the sectioned overview text for every university';

    private const UA = 'CASCatalogBot/1.0 (webai.auto@gmail.com)';

    private const SKIP_UNI = ['references', 'external links', 'see also', 'notes', 'further reading', 'gallery', 'bibliography', 'sources', 'footnotes', 'citations', 'notes and references', 'external links and references'];

    private const CITY_KEEP = ['geography', 'climate', 'economy', 'culture', 'education', 'transport', 'transportation', 'cuisine', 'tourism', 'demographics', 'sights', 'landmarks', 'parks', 'festivals', 'cityscape', 'sports', 'religion'];

    private const CITY_TITLES = [
        'Huangshan' => 'Huangshan City', 'Dali' => 'Dali City', 'Yangling' => 'Yangling District', 'Wuyishan' => 'Wuyishan City',
        'Jilin City' => 'Jilin City', 'Quanzhou' => 'Quanzhou', 'Luzhou' => 'Luzhou', 'Fuzhou' => 'Fuzhou', 'Suzhou' => 'Suzhou',
    ];

    /** @var array<string, array<int, array<string, mixed>>> */
    private array $cityCache = [];

    public function handle(): int
    {
        $query = University::query()->orderBy('name');
        if ($this->option('only')) {
            $query->whereIn('slug', $this->option('only'));
        }

        $buckets = ['0-999' => 0, '1000-1999' => 0, '2000-2999' => 0, '3000+' => 0];
        $total = 0;

        foreach ($query->get() as $uni) {
            $sections = [];

            $article = $this->uniArticle($uni);
            foreach ($article as $s) {
                $sections[] = $s;
            }

            foreach ($this->citySections($uni) as $s) {
                $sections[] = $s;
            }

            if ($this->words($sections) + 900 < 3000 || $this->words($sections) < 3000) {
                foreach ($this->provinceSections($uni, max(3000 - $this->words($sections) - 700, 600)) as $s) {
                    $sections[] = $s;
                }
            }

            foreach ([$this->programsSection($uni), $this->admissionSection($uni), $this->scholarshipSection($uni), $this->howToApply($uni)] as $s) {
                if ($s) {
                    $sections[] = $s;
                }
            }

            $words = $this->words($sections);
            $total++;
            $buckets[$words >= 3000 ? '3000+' : ($words >= 2000 ? '2000-2999' : ($words >= 1000 ? '1000-1999' : '0-999'))]++;
            $this->line(sprintf('%-60s %5d words', $uni->slug, $words));

            if (! $this->option('stats')) {
                $uni->forceFill(['overview' => $sections])->save();
            }
        }

        $this->info('Word counts: '.json_encode($buckets).' of '.$total);

        return self::SUCCESS;
    }

    /** @return list<array<string, mixed>> */
    private function uniArticle(University $uni): array
    {
        if (! $uni->wikipedia_url) {
            return [];
        }
        $title = urldecode(basename(parse_url($uni->wikipedia_url, PHP_URL_PATH)));
        $parsed = $this->parseArticle($this->extract($title));
        $out = [];
        $lead = array_shift($parsed);
        if ($lead && $lead['blocks']) {
            $out[] = ['h' => 'About '.$uni->name, 'level' => 2, 'blocks' => $lead['blocks']];
        }
        foreach ($parsed as $s) {
            if (in_array(strtolower($s['h']), self::SKIP_UNI, true) || ! $s['blocks']) {
                continue;
            }
            $out[] = $s;
        }

        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function citySections(University $uni): array
    {
        if (! $uni->city) {
            return [];
        }
        $title = self::CITY_TITLES[$uni->city] ?? $uni->city;
        $this->cityCache[$title] ??= $this->parseArticle($this->extract($title));
        $parsed = $this->cityCache[$title];

        $out = [];
        $budget = 1800;
        $top = null;
        foreach ($parsed as $s) {
            if ($s['level'] === 2) {
                $top = strtolower($s['h']);
            }
            if (! $top || ! in_array($top, self::CITY_KEEP, true) || ! $s['blocks']) {
                continue;
            }
            $n = $this->words([$s]);
            if ($budget - $n < -400) {
                continue;
            }
            $budget -= $n;
            $out[] = $s;
        }
        if (! $out) {
            return [];
        }

        return array_merge([['h' => 'Studying in '.$uni->city, 'level' => 2, 'blocks' => [['t' => 'p', 'x' => 'Most of what students need to know about daily life comes down to the city around the campus: its climate, how people get around, and what there is to do. The following sections describe '.$uni->city.', where '.$uni->name.' is located.']]]], $out);
    }

    /** @return list<array<string, mixed>> */
    private function provinceSections(University $uni, int $budget): array
    {
        $province = $uni->province;
        if (! $province || $province === $uni->city || in_array($province, ['Beijing', 'Shanghai', 'Tianjin', 'Chongqing'], true)) {
            return [];
        }
        $title = ['Tibet (Xizang)' => 'Tibet', 'Xinjiang' => 'Xinjiang', 'Guangxi' => 'Guangxi', 'Ningxia' => 'Ningxia', 'Inner Mongolia' => 'Inner Mongolia'][$province] ?? $province;
        $this->cityCache['prov:'.$title] ??= $this->parseArticle($this->extract($title));
        $keep = array_merge(self::CITY_KEEP, ['history', 'subdivisions']);
        $out = [];
        $top = null;
        foreach ($this->cityCache['prov:'.$title] as $s) {
            if ($s['level'] === 2) {
                $top = strtolower($s['h']);
            }
            if (! $top || ! in_array($top, $keep, true) || ! $s['blocks']) {
                continue;
            }
            $n = $this->words([$s]);
            if ($budget - $n < -500) {
                continue;
            }
            $budget -= $n;
            $out[] = $s;
        }
        if (! $out) {
            return [];
        }

        return array_merge([['h' => 'About '.$province, 'level' => 2, 'blocks' => [['t' => 'p', 'x' => $uni->name.' is in '.$province.', and the region around a university shapes student life as much as the campus does. The following sections describe '.$province.'.']]]], $out);
    }

    private function programsSection(University $uni): ?array
    {
        $programs = Program::where('university_id', $uni->id)->get(['name', 'level', 'teaching_language', 'tuition_fee', 'csc_listed', 'duration_months']);
        if ($programs->isEmpty()) {
            return null;
        }
        $blocks = [];
        $levels = $programs->groupBy('level');
        $label = ['bachelor' => 'bachelor', 'master' => 'master\'s', 'phd' => 'doctoral', 'non_degree' => 'non-degree', 'language' => 'language-course'];
        $parts = [];
        foreach (['bachelor', 'master', 'phd', 'non_degree', 'language'] as $l) {
            if ($levels->has($l)) {
                $parts[] = $levels[$l]->count().' '.$label[$l];
            }
        }
        $blocks[] = ['t' => 'p', 'x' => $uni->name.' lists '.$programs->count().' program'.($programs->count() === 1 ? '' : 's').' for international students on this site: '.implode(', ', $parts).' program'.($programs->count() === 1 ? '' : 's').'.'];

        $langs = $programs->whereNotNull('teaching_language')->groupBy('teaching_language')->map->count()->sortDesc();
        if ($langs->isNotEmpty()) {
            $blocks[] = ['t' => 'p', 'x' => 'By language of instruction: '.$langs->map(fn ($n, $l) => $n.' taught in '.$l)->implode(', ').'. English-taught programs do not require Chinese to start; for Chinese-taught programs you normally need an HSK certificate at the level the program sets.'];
        }

        foreach (['bachelor', 'master', 'phd'] as $l) {
            if (! $levels->has($l)) {
                continue;
            }
            $fees = $levels[$l]->pluck('tuition_fee')->filter()->map(fn ($v) => (float) $v);
            if ($fees->isNotEmpty()) {
                $blocks[] = ['t' => 'p', 'x' => 'Annual tuition for '.$label[$l].' programs ranges from CNY '.number_format($fees->min()).' to CNY '.number_format($fees->max()).' (median CNY '.number_format($fees->median()).'), according to the university\'s published fee table.'];
            }
        }

        $csc = $programs->where('csc_listed', true)->count();
        if ($csc > 0) {
            $blocks[] = ['t' => 'p', 'x' => $csc.' of these programs are listed as open to Chinese Government Scholarship (CSC) applicants, which means a CSC award can cover tuition, accommodation, a monthly stipend and medical insurance for eligible students.'];
        }

        $english = $programs->where('teaching_language', 'English')->whereIn('level', ['bachelor', 'master', 'phd'])->pluck('name')->unique()->sort()->values();
        if ($english->isNotEmpty()) {
            $blocks[] = ['t' => 'p', 'x' => 'English-taught degree programs ('.$english->count().'):'];
            foreach ($english->take(40) as $n) {
                $blocks[] = ['t' => 'li', 'x' => $n];
            }
            if ($english->count() > 40) {
                $blocks[] = ['t' => 'p', 'x' => 'and '.($english->count() - 40).' more; see the Programs tab for the full list with fees and durations.'];
            }
        }

        return ['h' => 'Programs for international students', 'level' => 2, 'blocks' => $blocks];
    }

    private function admissionSection(University $uni): ?array
    {
        $intakes = Intake::where('university_id', $uni->id)->where(fn ($q) => $q->whereNotNull('application_deadline')->orWhereNotNull('application_open_date'))->orderBy('application_deadline')->get();
        $blocks = [];
        if ($uni->moe_listed) {
            $blocks[] = ['t' => 'p', 'x' => $uni->name.' is on the Ministry of Education\'s list of universities approved to enrol international students in English-taught MBBS (Clinical Medicine) programs for '.($uni->moe_mbbs_year ?: '2026-27').'. Universities that are not on the annual list may not recruit English-taught MBBS students, so confirm the current list before you apply.'];
        }
        if ($intakes->isEmpty()) {
            $blocks[] = ['t' => 'p', 'x' => 'The university has not published an application window that we could confirm yet. Intake dates change every year; a CAS advisor can confirm the current window for your program before you apply.'];
        } else {
            $blocks[] = ['t' => 'p', 'x' => 'Application windows found for '.$uni->name.':'];
            foreach ($intakes as $i) {
                $window = trim(($i->application_open_date ? 'opens '.$i->application_open_date->format('j M Y') : '').($i->application_open_date && $i->application_deadline ? ', ' : '').($i->application_deadline ? 'closes '.$i->application_deadline->format('j M Y') : ''));
                $blocks[] = ['t' => 'li', 'x' => $i->name.($window ? ': '.$window : '')];
            }
            $blocks[] = ['t' => 'p', 'x' => 'Deadlines can move and seats can fill earlier than the closing date, so apply as soon as your documents are ready.'];
        }

        return ['h' => 'Admission and application windows', 'level' => 2, 'blocks' => $blocks];
    }

    private function scholarshipSection(University $uni): ?array
    {
        $own = Scholarship::where('university_id', $uni->id)->where('status', 'active')->orderBy('name')->get();
        $blocks = [['t' => 'p', 'x' => 'International students at Chinese universities can fund their studies through the Chinese Government Scholarship (CSC), provincial and city government scholarships, and university scholarships. Each has its own application route and timetable, and some are applied for through your home country\'s Chinese embassy rather than the university.']];
        if ($own->isNotEmpty()) {
            $blocks[] = ['t' => 'p', 'x' => 'Scholarships listed for '.$uni->name.':'];
            foreach ($own as $s) {
                $blocks[] = ['t' => 'li', 'x' => $s->name.($s->coverage ? ' ('.$s->coverage.')' : '')];
            }
        }

        return ['h' => 'Scholarships and funding', 'level' => 2, 'blocks' => $blocks];
    }

    private function howToApply(University $uni): array
    {
        $steps = [
            'Choose a program and check its language of instruction, duration and annual tuition on the Programs tab.',
            'Check the admission requirements: a valid foreign passport, good health, and the right previous qualification (high-school graduation for a bachelor\'s degree, a bachelor\'s degree for a master\'s, a master\'s degree for a doctorate).',
            'Bachelor\'s applicants take the China Scholastic Competency Assessment (CSCA) and send the result with the application.',
            'Prove language ability: an HSK certificate for Chinese-taught programs, or English test results (for example IELTS or TOEFL) for English-taught programs, unless you studied in English.',
            'Prepare certified transcripts and diplomas, a physical examination form, a police clearance certificate and a study plan or personal statement where the program asks for them.',
            'Apply online through the university\'s international student system, or let CAS prepare and submit the application for you, and pay the application fee.',
            'After admission you receive an admission notice and a JW202 or JW201 form, which you take to the Chinese embassy or consulate to apply for an X1 (long-term study) visa.',
            'Travel to '.($uni->city ?: 'China').', register at '.$uni->name.' by the date in the admission notice, and convert your entry visa into a residence permit within 30 days of arrival.',
        ];

        return [
            'h' => 'How to apply, step by step',
            'level' => 2,
            'blocks' => array_merge(
                [['t' => 'p', 'x' => 'The process below is the general route for international degree applicants to Chinese universities. '.$uni->name.' may add its own forms, interviews or deadlines, which a CAS advisor confirms before you apply.']],
                array_map(fn ($s) => ['t' => 'li', 'x' => $s], $steps)
            ),
        ];
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

    /**
     * @return list<array{h: string, level: int, blocks: list<array{t: string, x: string}>}>
     */
    private function parseArticle(string $text): array
    {
        if ($text === '') {
            return [];
        }
        $sections = [['h' => '', 'level' => 2, 'blocks' => []]];
        foreach (preg_split('/\R/u', $text) as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            if (preg_match('/^(={2,4})\s*(.+?)\s*\1$/', $line, $m)) {
                $sections[] = ['h' => $m[2], 'level' => min(strlen($m[1]), 3), 'blocks' => []];

                continue;
            }
            $last = count($sections) - 1;
            $short = mb_strlen($line) < 70 && ! preg_match('/[.!?]$/u', $line);
            $sections[$last]['blocks'][] = ['t' => $short ? 'li' : 'p', 'x' => $line];
        }

        return $sections;
    }

    /** @param list<array<string, mixed>> $sections */
    private function words(array $sections): int
    {
        $n = 0;
        foreach ($sections as $s) {
            foreach ($s['blocks'] as $b) {
                $n += str_word_count(preg_replace('/[^\p{L}\p{N}\s\'-]/u', ' ', $b['x'])) ?: count(preg_split('/\s+/', trim($b['x'])));
            }
        }

        return $n;
    }
}

<?php

namespace App\Services\Seo;

use App\Models\Program;
use App\Models\University;
use Illuminate\Support\Collection;

/**
 * The questions and answers shown on public pages, in one place, so the page people see, the text crawlers read
 * and the FAQ structured data always say the same thing. Answers for universities and cities are built only from
 * catalog data; nothing is stated that the catalog does not hold.
 *
 * @phpstan-type Faq array{q: string, a: string}
 */
class PageFaqs
{
    /** @var array<string, mixed>|null */
    private ?array $file = null;

    /**
     * Questions for a fixed page such as "" (home) or "site/csc-scholarship".
     *
     * @return list<array{q: string, a: string}>
     */
    public function forPath(string $path): array
    {
        $entry = $this->file()[trim($path, '/')] ?? null;
        if (! $entry) {
            return [];
        }

        $faqs = [];
        // Questions reused from the main FAQ, so the same answer is never written twice.
        foreach ($entry['from_faq'] ?? [] as $question) {
            if ($answer = $this->generalAnswer($question)) {
                $faqs[] = ['q' => $question, 'a' => $answer];
            }
        }
        foreach ($entry['items'] ?? [] as $item) {
            $faqs[] = ['q' => $item['q'], 'a' => $this->fill($item['a'])];
        }

        return $faqs;
    }

    /**
     * @param  Collection<int, Program>  $programs  active programs of the university
     * @return list<array{q: string, a: string}>
     */
    public function forUniversity(University $u, Collection $programs, int $intakes, Collection $scholarshipNames): array
    {
        $name = $u->name;
        $place = collect([$u->city, $u->province])->filter()->unique()->implode(', ');
        $confirmed = $programs->where('registry_only', false);
        $registered = $programs->where('registry_only', true);
        $english = $confirmed->where('teaching_language', 'English')->pluck('name')->unique()->sort()->values();
        $faqs = [];

        if ($u->moe_listed) {
            $faqs[] = ['q' => 'Is '.$name.' approved for English-taught MBBS in China?', 'a' => 'Yes. '.$name.' is on the list of universities that China\'s Ministry of Education approves to enrol international students in English-taught MBBS'.($u->moe_mbbs_year ? ' ('.$u->moe_mbbs_year.')' : '').'. Universities that are not on the list may not recruit English-taught MBBS students.'];
        }

        if ($place) {
            $answer = $name.' is in '.$place.', China.';
            if ($u->founded_year) {
                $answer .= ' It was founded in '.$u->founded_year.'.';
            }
            if ($u->nearest_airport) {
                $answer .= ' The nearest airport is '.$u->nearest_airport.'.';
            }
            $faqs[] = ['q' => 'Where is '.$name.'?', 'a' => $answer];
        }

        if ($confirmed->isNotEmpty()) {
            $faqs[] = ['q' => 'What can international students study at '.$name.'?', 'a' => 'CAS lists '.$this->count($confirmed->count(), 'program').' for international students at '.$name.': '.$this->levels($confirmed).'.'];
        } elseif ($registered->isNotEmpty()) {
            $faqs[] = ['q' => 'What can international students study at '.$name.'?', 'a' => $name.' has '.$this->count($registered->count(), 'major').' registered with China\'s Ministry of Education: '.$this->levels($registered).'. CAS confirms on request which of them are open to international applicants, the teaching language and the fees.'];
        }

        if ($english->isNotEmpty()) {
            $faqs[] = ['q' => 'Does '.$name.' teach in English?', 'a' => 'Yes. '.$this->count($english->count(), 'program').' that CAS lists at '.$name.' '.($english->count() === 1 ? 'is' : 'are').' taught in English, such as '.$english->take(3)->implode(', ').'.'];
        }

        $faqs[] = ['q' => 'When can I apply to '.$name.'?', 'a' => $intakes > 0
            ? 'CAS lists '.$this->count($intakes, 'application window').' for '.$name.'. The opening and closing dates are on this page, and a CAS counselor confirms them before you apply.'
            : 'CAS has not published application dates for '.$name.' yet. Ask a CAS counselor for the current window before you prepare your documents.'];

        if ($scholarshipNames->isNotEmpty()) {
            $faqs[] = ['q' => 'Are scholarships available at '.$name.'?', 'a' => 'CAS lists '.$this->count($scholarshipNames->count(), 'scholarship').' that '.($scholarshipNames->count() === 1 ? 'applies' : 'apply').' to '.$name.', including '.$scholarshipNames->take(3)->implode(', ').'. Each one states what it covers.'];
        }

        $faqs[] = ['q' => 'How do I apply to '.$name.'?', 'a' => 'Apply online through CAS: create a student account, choose '.$name.' and your program, and upload your documents. A CAS counselor checks the application before it goes to the university. The first consultation and the study plan are free.'];

        return $faqs;
    }

    /**
     * @param  Collection<int, University>  $inCity
     * @return list<array{q: string, a: string}>
     */
    public function forCity(string $city, Collection $inCity): array
    {
        $province = $inCity->first()?->province;
        $where = $province && $province !== $city ? $city.', '.$province : $city;
        $names = $inCity->pluck('name');
        $mbbs = $inCity->where('moe_listed', true)->pluck('name');
        $faqs = [];

        $faqs[] = ['q' => 'How many universities are in '.$city.'?', 'a' => 'CAS lists '.$this->count($names->count(), 'university', 'universities').' and colleges in '.$where.' for international students'.($names->count() <= 6 ? ': '.$names->implode(', ').'.' : ', including '.$names->take(5)->implode(', ').'.')];

        if ($mbbs->isNotEmpty()) {
            $faqs[] = ['q' => 'Which universities in '.$city.' are approved for English-taught MBBS?', 'a' => $mbbs->implode(', ').' '.($mbbs->count() === 1 ? 'is' : 'are').' on the Ministry of Education\'s list of universities approved to enrol international students in English-taught MBBS.'];
        }

        if ($province && $province !== $city) {
            $faqs[] = ['q' => 'Where is '.$city.'?', 'a' => $city.' is a city in '.$province.', China.'];
        }

        $faqs[] = ['q' => 'How do I apply to a university in '.$city.'?', 'a' => 'Pick a university in '.$city.' on this page, then apply online through CAS: create a student account, choose your program and upload your documents. A CAS counselor checks the application before it goes to the university. The first consultation and the study plan are free.'];

        return $faqs;
    }

    /**
     * Questions that follow from the live catalog numbers of a keyword page.
     *
     * @param  array<string, mixed>|null  $facts
     * @return list<array{q: string, a: string}>
     */
    public function forTopicFacts(string $subject, ?array $facts): array
    {
        if (! $facts) {
            return [];
        }
        $faqs = [['q' => 'How many programs does CAS list for '.$subject.'?', 'a' => 'Right now CAS lists '.$this->count((int) $facts['programs'], 'matching program').' at '.$this->count((int) $facts['universities'], 'university', 'universities').'. The numbers come from the live catalog, so they change as programs are added.']];

        if (! empty($facts['tuition'])) {
            $t = $facts['tuition'];
            $faqs[] = ['q' => 'What tuition do these programs charge?', 'a' => 'Public tuition for the matching bachelor programs runs from '.number_format($t['min']).' to '.number_format($t['max']).' CNY a year, across '.$this->count((int) $t['programs'], 'program').' with a published fee. Accommodation and living costs are extra.'];
        }

        if (! empty($facts['deadlines'])) {
            $d = $facts['deadlines'][0];
            $faqs[] = ['q' => 'When is the next application deadline?', 'a' => 'The next deadline CAS lists is '.date('j F Y', strtotime($d['date'])).' at '.$d['university'].'. Deadlines differ by university, so check the one you want before you prepare your documents.'];
        }

        return $faqs;
    }

    /**
     * Headings written as questions in an article, each with the text that follows it.
     *
     * @return list<array{q: string, a: string}>
     */
    public function fromHtml(?string $html): array
    {
        if (! $html || ! preg_match_all('#<h([23])[^>]*>(.*?)</h\1>(.*?)(?=<h[1-6][\s>]|$)#is', $html, $matches, PREG_SET_ORDER)) {
            return [];
        }

        $faqs = [];
        foreach ($matches as $m) {
            $question = $this->text($m[2]);
            $answer = $this->text($m[3]);
            if (str_ends_with($question, '?') && mb_strlen($answer) >= 40) {
                $faqs[] = ['q' => $question, 'a' => mb_strlen($answer) > 700 ? rtrim(mb_substr($answer, 0, 699), ' ,;:').'…' : $answer];
            }
        }

        return count($faqs) >= 2 ? $faqs : [];
    }

    /**
     * @param  list<array{q: string, a: string}>  $faqs
     * @return array<string, mixed>|null
     */
    public function jsonLd(array $faqs): ?array
    {
        if (! $faqs) {
            return null;
        }

        return [
            '@context' => 'https://schema.org',
            '@type' => 'FAQPage',
            'mainEntity' => array_map(fn ($f) => ['@type' => 'Question', 'name' => $f['q'], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f['a']]], $faqs),
        ];
    }

    /** @param list<array{q: string, a: string}> $faqs */
    public function html(array $faqs, string $title = 'Frequently asked questions'): string
    {
        if (! $faqs) {
            return '';
        }
        $html = '<h2>'.e($title).'</h2>';
        foreach ($faqs as $f) {
            $html .= '<h3>'.e($f['q']).'</h3><p>'.e($f['a']).'</p>';
        }

        return $html;
    }

    // ---------------------------------------------------------------- helpers

    /** @return array<string, mixed> */
    private function file(): array
    {
        if ($this->file === null) {
            $path = database_path('data/page_faqs.json');
            $this->file = is_file($path) ? (json_decode((string) file_get_contents($path), true) ?: []) : [];
        }

        return $this->file;
    }

    private function generalAnswer(string $question): ?string
    {
        $path = database_path('data/faq.json');
        $groups = is_file($path) ? (json_decode((string) file_get_contents($path), true) ?: []) : [];
        foreach ($groups as $group) {
            foreach ($group['items'] as $item) {
                if ($item['q'] === $question) {
                    return $item['a'];
                }
            }
        }

        return null;
    }

    /** Fills {mbbs_count} with today's number of approved universities. */
    private function fill(string $text): string
    {
        if (! str_contains($text, '{mbbs_count}')) {
            return $text;
        }
        $count = cache()->remember('seo.mbbs_count.v1', now()->addMinutes(30), fn () => University::where('status', 'active')->where('moe_listed', true)->count());

        return str_replace('{mbbs_count}', (string) $count, $text);
    }

    private function count(int $n, string $one, ?string $many = null): string
    {
        return number_format($n).' '.($n === 1 ? $one : ($many ?? $one.'s'));
    }

    /** "12 bachelor's, 4 master's and 2 doctoral" from a set of programs. */
    private function levels(Collection $programs): string
    {
        $labels = ['bachelor' => "bachelor's", 'master' => "master's", 'phd' => 'doctoral', 'non_degree' => 'non-degree or language', 'diploma' => 'diploma'];
        $parts = [];
        foreach ($labels as $level => $label) {
            $n = $programs->where('level', $level)->count();
            if ($n > 0) {
                $parts[] = $n.' '.$label;
            }
        }
        if (! $parts) {
            return $this->count($programs->count(), 'program');
        }
        $last = array_pop($parts);

        return $parts ? implode(', ', $parts).' and '.$last : $last;
    }

    private function text(string $html): string
    {
        return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags(preg_replace('#</(p|li|h\d|div)>|<br\s*/?>#i', ' ', $html)), ENT_QUOTES | ENT_HTML5)));
    }
}

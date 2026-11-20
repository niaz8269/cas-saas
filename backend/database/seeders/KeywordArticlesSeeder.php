<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\Program;
use App\Models\University;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

/**
 * Articles for searches the site had no article for: engineering in China, dentistry (BDS), Chinese language
 * programs and the cost of studying in China.
 *
 * Same rules as SeoArticlesSeeder: original explainers and no invented figures. Every number is computed from
 * the catalog when the seeder runs, university lists are catalog queries, and anything that changes each year
 * (fees, dates, national rules) sends the reader to the live page or to the authority that sets it.
 *
 * Idempotent: keyed on slug.
 */
class KeywordArticlesSeeder extends Seeder
{
    private const CTA = '<h2>Need help choosing?</h2><p>CAS is an authorized agency that places international students into Chinese universities. <a href="/site/study-plan">Get a free study plan</a>, <a href="/site/contact">talk to a counselor</a>, or see <a href="/site/services">everything we do for students</a>.</p>';

    private const NOTE = '<p><em>Fees, dates and entry rules change from year to year. The numbers in this article come from the CAS catalog on the day it was last updated; confirm the details for your intake on the university page and with your own regulator.</em></p>';

    public function run(): void
    {
        if (! Schema::hasTable('posts')) {
            return;
        }

        foreach ($this->articles() as $a) {
            Post::updateOrCreate(['slug' => $a['slug']], [
                'type' => 'news',
                'title' => $a['title'],
                'excerpt' => $a['excerpt'],
                'body' => $a['body'],
                'category' => $a['category'],
                'cover_image_path' => $a['cover'] ?? '/images/header-default-v3.webp',
                'status' => 'published',
                'published_at' => $a['date'],
            ]);
        }
    }

    // ── building blocks ─────────────────────────────────────────────────────

    /** Active programs CAS has confirmed (not registry-only) at active universities. */
    private function programs(): Builder
    {
        return Program::query()->where('status', 'active')->where('registry_only', false)
            ->whereHas('university', fn ($q) => $q->where('status', 'active'));
    }

    /**
     * Universities with matching programs, most programs first.
     *
     * @param  list<string>  $terms
     */
    private function universitiesWith(array $terms, ?string $language = 'English', int $limit = 20): Collection
    {
        $match = function ($q) use ($terms, $language) {
            $q->where('status', 'active')->where('registry_only', false)
                ->when($language, fn ($w) => $w->where('teaching_language', $language))
                ->where(function ($or) use ($terms) {
                    foreach ($terms as $t) {
                        $or->orWhere('name', 'like', '%'.$t.'%');
                    }
                });
        };

        return University::query()->where('status', 'active')->whereHas('programs', $match)
            ->withCount(['programs as matching' => $match])
            ->orderByDesc('matching')->orderBy('name')->limit($limit)
            ->get(['id', 'name', 'slug', 'city', 'cover_path', 'cover_credit']);
    }

    /** @param list<string> $terms */
    private function countPrograms(array $terms, ?string $language = null): int
    {
        return $this->programs()
            ->when($language, fn ($w) => $w->where('teaching_language', $language))
            ->where(function ($or) use ($terms) {
                foreach ($terms as $t) {
                    $or->orWhere('name', 'like', '%'.$t.'%');
                }
            })->count();
    }

    /**
     * Median and the middle 80% of public yearly tuition (CNY) for English-taught programs of a level.
     *
     * @return array{median: int, low: int, high: int, count: int}|null
     */
    private function tuition(string $level): ?array
    {
        $fees = [];
        $this->programs()->where('level', $level)->where('teaching_language', 'English')->where('currency', 'CNY')->where('tuition_fee', '>', 0)
            ->select(['id', 'tuition_fee', 'currency', 'visibility'])->cursor()
            ->each(function (Program $p) use (&$fees) {
                if ($p->audienceCanSee('tuition_fee', 'public')) {
                    $fees[] = (float) $p->tuition_fee;
                }
            });
        if (count($fees) < 5) {
            return null;
        }
        sort($fees);
        $at = fn (float $q) => (int) round($fees[(int) floor($q * (count($fees) - 1))], -2);

        return ['median' => $at(0.5), 'low' => $at(0.1), 'high' => $at(0.9), 'count' => count($fees)];
    }

    private function list(Collection $unis): string
    {
        if ($unis->isEmpty()) {
            return '<p>Use the <a href="/site/programs">program finder</a> to see what is open now.</p>';
        }

        return '<ul>'.$unis->map(fn ($u) => '<li><a href="/site/universities/'.e($u->slug).'">'.e($u->name).'</a>'.($u->city ? ' ('.e($u->city).')' : '').'</li>')->implode('').'</ul>';
    }

    private function figure(?University $u, string $what): string
    {
        if (! $u || ! $u->cover_path || ! str_starts_with($u->cover_path, '/') || ! $u->cover_credit) {
            return '';
        }

        return '<figure><img src="'.e($u->cover_path).'" alt="'.e($what.': '.$u->name.', '.$u->city.', China').'" loading="lazy" />'
            .'<figcaption>'.e($what).': <a href="/site/universities/'.e($u->slug).'">'.e($u->name).'</a>, '.e($u->city).'. Photo: '.e($u->cover_credit).'</figcaption></figure>';
    }

    private function cover(?University $u): string
    {
        return $u && $u->cover_path && str_starts_with($u->cover_path, '/') ? $u->cover_path : '/images/header-default-v3.webp';
    }

    /** @param list<string> $points */
    private function summary(array $points): string
    {
        return '<h2>In short</h2><ul>'.collect($points)->map(fn ($x) => '<li>'.$x.'</li>')->implode('').'</ul>';
    }

    /** @param list<array{0:string,1:string}> $qa */
    private function faq(array $qa): string
    {
        return '<h2>Frequently asked questions</h2>'.collect($qa)->map(fn ($x) => '<h3>'.$x[0].'</h3><p>'.$x[1].'</p>')->implode('');
    }

    private function n(int $n, string $one, ?string $many = null): string
    {
        return number_format($n).' '.($n === 1 ? $one : ($many ?? $one.'s'));
    }

    // ── the articles ────────────────────────────────────────────────────────

    /** @return list<array<string, string>> */
    private function articles(): array
    {
        return [$this->engineering(), $this->dentistry(), $this->language(), $this->costs()];
    }

    /** @return array<string, string> */
    private function engineering(): array
    {
        $unis = $this->universitiesWith(['Engineering']);
        $total = $this->countPrograms(['Engineering']);
        $english = $this->countPrograms(['Engineering'], 'English');
        $withPhoto = $unis->first(fn ($u) => $u->cover_credit && str_starts_with((string) $u->cover_path, '/'));
        $fields = collect(['Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Computer Science', 'Software Engineering', 'Chemical Engineering', 'Aerospace', 'Biomedical Engineering'])
            ->map(fn ($f) => ['name' => $f, 'count' => $this->countPrograms([$f])])->filter(fn ($f) => $f['count'] > 0)->values();

        return [
            'slug' => 'engineering-in-china-for-international-students',
            'title' => 'Engineering in China for International Students',
            'excerpt' => 'Studying engineering in China: the fields you can choose, English-taught or Chinese-taught degrees, entry requirements and how to apply.',
            'category' => 'Engineering in China',
            'date' => '2026-11-21 09:00:00',
            'cover' => $this->cover($withPhoto),
            'body' => '<p>Engineering is one of the most common reasons international students choose China. Chinese universities teach it at every level, from bachelor&rsquo;s degrees to doctoral research, and a growing number of programs are taught in English. This guide explains how the degrees are organised, what universities ask for, and how to choose and apply.</p>'
                .$this->summary([
                    'CAS lists '.$this->n($total, 'engineering program').' for international students, '.number_format($english).' of them taught in English.',
                    'A bachelor&rsquo;s degree in engineering normally takes four years; a master&rsquo;s two to three; a doctorate three to four.',
                    'English-taught degrees need proof of English; Chinese-taught degrees need an HSK certificate.',
                    'Check that the degree meets the rules for engineers in the country where you plan to work.',
                ])
                .$this->figure($withPhoto, 'A university that teaches engineering')
                .'<h2>Which engineering fields can you study in China?</h2><p>Most branches of engineering are available. The table of contents of a Chinese engineering faculty looks much like one anywhere else: civil, mechanical, electrical, chemical and computer-related degrees, with specialised fields at universities that have a long history in them.</p>'
                .($fields->isNotEmpty() ? '<p>In the CAS catalog today:</p><ul>'.$fields->map(fn ($f) => '<li>'.e($f['name']).': '.$this->n($f['count'], 'program').'</li>')->implode('').'</ul>' : '')
                .'<p>Our topic pages go deeper into single fields: <a href="/site/civil-engineering-in-china">civil</a>, <a href="/site/mechanical-engineering-in-china">mechanical</a>, <a href="/site/aerospace-engineering-in-china">aerospace</a>, <a href="/site/biomedical-engineering-in-china">biomedical</a> and <a href="/site/automotive-engineering-in-china">automotive engineering</a>.</p>'
                .'<h2>English-taught or Chinese-taught?</h2><p>You can study engineering in either language. English-taught degrees let you start without Chinese, and universities usually add Chinese language classes so that daily life and internships are easier. Chinese-taught degrees offer the widest choice of fields and universities, but you need an HSK certificate at the level the university sets, and many students spend a preparatory year on the language first.</p>'
                .'<p>Neither route is better in itself. Choose English-taught if you want to start the degree straight away, and Chinese-taught if the exact field you want is only offered in Chinese or you plan to work in China afterwards.</p>'
                .'<h2>What are the entry requirements?</h2><p>Each university sets its own, and they differ by level:</p><ul><li><strong>Bachelor&rsquo;s:</strong> a completed high-school certificate, normally with mathematics and physics, and a language certificate for the teaching language</li><li><strong>Master&rsquo;s:</strong> a bachelor&rsquo;s degree in a related field, transcripts, two recommendation letters and a study plan</li><li><strong>Doctorate:</strong> a master&rsquo;s degree, a research proposal, and usually contact with a supervisor before you apply</li></ul><p>Some universities also ask for an entrance test or an interview. The program page on CAS shows the requirements we have confirmed for each program.</p>'
                .'<h2>How do you choose a university for engineering?</h2><ul><li>Start from the field, not the university name: a university can be strong in one branch and ordinary in another</li><li>Read the program page for the teaching language, the length and the tuition</li><li>Look at the city: living costs, climate and the industry around it differ a great deal</li><li>For research degrees, look at the supervisor and the laboratory as closely as the university</li><li>Shortlist several universities, because application windows and quotas differ</li></ul>'
                .'<h2>Universities with the most English-taught engineering programs</h2><p>From the CAS catalog, most programs first:</p>'.$this->list($unis)
                .'<h2>How do you apply?</h2><ol><li>Shortlist programs with the <a href="/site/programs?q=engineering">program finder</a></li><li>Collect your documents: passport, certificates and transcripts, language certificate, and for postgraduate study the recommendation letters and study plan</li><li>Apply online through CAS before the university&rsquo;s window closes</li><li>Wait for the admission notice and the visa application form, then apply for the student visa</li></ol><p>If you want funding, read our <a href="/site/csc-scholarship">CSC scholarship guide</a> first: scholarship deadlines are usually earlier than self-funded ones.</p>'
                .$this->faq([
                    ['Is an engineering degree from China recognised abroad?', 'Recognition is decided by each country and by its engineering body, not by the university. Check the rules of the country where you plan to work before you choose a program.'],
                    ['Can I study engineering in China in English?', 'Yes. CAS lists '.number_format($english).' engineering programs taught in English. The program page states the teaching language.'],
                    ['Do I need to know Chinese?', 'Not for an English-taught degree. For a Chinese-taught degree you need the HSK level the university sets.'],
                    ['How long does an engineering degree take?', 'A bachelor&rsquo;s degree normally takes four years, a master&rsquo;s two to three and a doctorate three to four. The program page gives the exact length.'],
                    ['Are there scholarships for engineering students?', 'Yes. Government, provincial and university scholarships are open to engineering applicants. See the <a href="/site/scholarships">scholarships page</a> for what each one covers.'],
                ])
                .self::NOTE.self::CTA,
        ];
    }

    /** @return array<string, string> */
    private function dentistry(): array
    {
        $terms = ['Stomatolog', 'Dentist', 'Dental', 'BDS'];
        $unis = $this->universitiesWith($terms, null);
        $total = $this->countPrograms($terms);
        $english = $this->countPrograms($terms, 'English');
        $withPhoto = $unis->first(fn ($u) => $u->cover_credit && str_starts_with((string) $u->cover_path, '/'));

        return [
            'slug' => 'bds-in-china-dentistry-for-international-students',
            'title' => 'BDS in China: Studying Dentistry as an International Student',
            'excerpt' => 'How dentistry (BDS, called Stomatology in China) is taught to international students: the degree, the language, entry requirements and what to check before you apply.',
            'category' => 'BDS in China',
            'date' => '2026-11-21 10:00:00',
            'cover' => $this->cover($withPhoto),
            'body' => '<p>Dentistry in China is taught under the name Stomatology. International students who search for &ldquo;BDS in China&rdquo; are looking for the bachelor&rsquo;s degree in Stomatology, which trains dentists in the same way a BDS does elsewhere. This guide explains the degree, the language it is taught in, and the checks to make before you apply.</p>'
                .$this->summary([
                    'The dental degree in China is the Bachelor of Stomatology; universities often describe it as BDS for international students.',
                    'CAS lists '.$this->n($total, 'dentistry program').', '.number_format($english).' of them taught in English.',
                    'The Ministry of Education&rsquo;s approved list covers English-taught MBBS, not dentistry, so check each dental program on its own.',
                    'Your right to practise at home depends on your own dental council, so read its rules first.',
                ])
                .$this->figure($withPhoto, 'A university that teaches dentistry')
                .'<h2>What is a BDS called in China?</h2><p>Chinese universities award a Bachelor of Stomatology. The word covers the teeth, mouth and jaw, and the course includes the subjects a BDS student expects: oral anatomy, dental materials, restorative dentistry, prosthodontics, orthodontics, oral surgery and periodontology, with clinical practice in a teaching hospital in the later years.</p>'
                .'<h2>How long does it take?</h2><p>The bachelor&rsquo;s degree in Stomatology normally runs five years, including a year of clinical internship. Some universities set a different length for international students, and Chinese-taught students may add a language year first. The program page gives the length for each program.</p>'
                .'<h2>Is dentistry taught in English?</h2><p>Some universities teach it in English and more teach it in Chinese. In an English-taught program you still learn Chinese alongside the degree, because clinical training means talking to patients. If the program is taught in Chinese you need the HSK level the university sets before the degree starts.</p>'
                .'<h2>What are the entry requirements?</h2><ul><li>A completed high-school certificate with biology and chemistry, and usually physics or mathematics</li><li>Proof of English for an English-taught program, or an HSK certificate for a Chinese-taught one</li><li>A valid passport, a medical examination record and a criminal record certificate</li><li>The age and grade limits the university sets, which differ from one to another</li></ul>'
                .'<h2>What should you check before applying?</h2><p>Dentistry is a licensed profession, so the most important checks are outside China:</p><ul><li>Read your national dental council&rsquo;s rules for degrees earned abroad, including any screening or licensing exam</li><li>Ask whether the council needs the degree to be taught in English, a minimum length, or a minimum number of clinical hours</li><li>Confirm the teaching language and the internship arrangements with the university in writing</li><li>Ask for the current fee notice, because fees are set year by year</li></ul><p>The Ministry of Education&rsquo;s yearly approved list is for English-taught MBBS (Clinical Medicine). It does not list dental programs, so a university being on that list tells you nothing about its dentistry degree. Compare the two routes in our guide to <a href="/site/news/study-medicine-in-china-mbbs-bds-tcm">studying medicine in China: MBBS, BDS and TCM</a>.</p>'
                .'<h2>Universities that teach dentistry</h2><p>From the CAS catalog, most programs first:</p>'.$this->list($unis)
                .'<p>See also our <a href="/site/bds-in-china">BDS in China page</a>, and the pages for <a href="/site/bds-in-china-for-pakistani-students">Pakistani</a> and <a href="/site/bds-in-china-for-indian-students">Indian</a> students.</p>'
                .$this->faq([
                    ['Is a BDS from China valid in my country?', 'That is decided by your national dental council, not by the university. Check its rules for foreign degrees, including any licensing exam, before you apply.'],
                    ['Is BDS in China taught in English?', 'Some programs are. CAS lists '.number_format($english).' dentistry programs taught in English; the program page states the language.'],
                    ['How many years is BDS in China?', 'The Bachelor of Stomatology normally takes five years including the clinical internship. The program page gives the exact length.'],
                    ['Is dentistry on the approved MBBS list?', 'No. The Ministry of Education&rsquo;s list covers English-taught MBBS only. Dental programs have to be checked one by one.'],
                    ['Can I get a scholarship for dentistry?', 'Government, provincial and university scholarships can be open to dentistry applicants. The <a href="/site/scholarships">scholarships page</a> shows what each one covers.'],
                ])
                .self::NOTE.self::CTA,
        ];
    }

    /** @return array<string, string> */
    private function language(): array
    {
        $terms = ['Chinese Language', 'Mandarin', 'Language Program', 'Language Course'];
        $unis = $this->universitiesWith($terms, null);
        $total = $this->countPrograms($terms);
        $withPhoto = $unis->first(fn ($u) => $u->cover_credit && str_starts_with((string) $u->cover_path, '/'));

        return [
            'slug' => 'chinese-language-programs-in-china-how-to-choose-and-apply',
            'title' => 'Chinese Language Programs in China: How to Choose and Apply',
            'excerpt' => 'Learning Chinese at a university in China: how long the courses run, what the HSK levels mean, who can apply, the visa you need and how to choose a city.',
            'category' => 'Chinese language',
            'date' => '2026-11-21 11:00:00',
            'cover' => $this->cover($withPhoto),
            'body' => '<p>A Chinese language program at a university in China is the most direct way to learn Mandarin: classes every weekday, a campus where the language is used around you, and a certificate at the end. It is also the usual first step for students who want a Chinese-taught degree. This guide explains how the programs work and how to pick one.</p>'
                .$this->summary([
                    'Programs run for one semester or one academic year, and many universities also offer short courses.',
                    'CAS lists '.$this->n($total, 'Chinese language program').' at universities across China.',
                    'There is usually no language requirement to start: classes are grouped by level.',
                    'Study longer than six months needs an X1 visa; a shorter course normally uses an X2 visa.',
                ])
                .$this->figure($withPhoto, 'A university that teaches Chinese to international students')
                .'<h2>How are the programs organised?</h2><p>Universities place you in a class by level after a placement test, from complete beginner upwards. A typical week has classes in comprehensive Chinese, listening, speaking, reading and writing, with optional classes in subjects such as calligraphy or business Chinese. Most programs start in September or in spring, and you can usually join for one semester or a full year.</p>'
                .'<h2>What do the HSK levels mean?</h2><p>HSK is the standard test of Chinese for non-native speakers. Universities use it in two ways: to place you in a class, and as an entry requirement for Chinese-taught degrees. Each university states the level it wants for each degree, and it is usually higher for postgraduate study and for subjects with heavy reading. If a degree is your goal, ask the university which level it needs before you choose the length of your language program.</p>'
                .'<h2>Who can apply?</h2><ul><li>Adults with a completed high-school certificate; universities set their own age limits</li><li>Beginners are welcome: there is normally no language requirement</li><li>You need a valid passport and, for longer study, a medical examination record</li></ul>'
                .'<h2>Which visa do you need?</h2><p>A program longer than six months needs the X1 student visa, which you convert to a residence permit after you arrive. A course of six months or less normally uses the X2 visa. The university sends the admission notice and the visa application form you need for either. Our <a href="/site/news/china-x1-student-visa-guide">student visa guide</a> explains the steps, and the page on <a href="/site/study-in-china-for-six-months">studying in China for six months</a> covers short courses.</p>'
                .'<h2>How do you choose a city and a university?</h2><ul><li>Standard Mandarin is taught everywhere, but what you hear in the street differs: northern cities are closer to the standard accent</li><li>Big cities offer more part-time classes and events; smaller cities give you more practice because fewer people speak English</li><li>Compare tuition, dormitory costs and living costs, which differ a great deal between cities</li><li>If you plan a degree afterwards, consider studying the language at the university you want to enter</li></ul><p>Browse <a href="/site/cities">study in China by city</a> to compare places.</p>'
                .'<h2>Can you get a scholarship for a language program?</h2><p>Yes. Some government and university scholarships fund language study, including awards aimed at students of Chinese. What they cover and when they open differs by scheme, so read our page on the <a href="/site/chinese-language-program-scholarship">Chinese language program scholarship</a> and the <a href="/site/scholarships">scholarships list</a>.</p>'
                .'<h2>Universities with Chinese language programs</h2><p>From the CAS catalog:</p>'.$this->list($unis)
                .$this->faq([
                    ['Can a complete beginner join a Chinese language program?', 'Yes. Universities test your level when you arrive and place beginners in their own class.'],
                    ['How long does it take to learn Chinese in China?', 'It depends on your starting point and your goal. Programs run for a semester or a year, and you can continue for further semesters. Ask the university which HSK level students usually reach after each stage.'],
                    ['Do I need HSK to apply?', 'Not for a language program. HSK is needed later if you apply for a Chinese-taught degree.'],
                    ['Can I work while I study?', 'Student visas have strict rules on work. Ask the university&rsquo;s international office what is allowed before you take any job.'],
                    ['When should I apply?', 'Each university sets its own window. The program page on CAS shows the window we have confirmed.'],
                ])
                .self::NOTE.self::CTA,
        ];
    }

    /** @return array<string, string> */
    private function costs(): array
    {
        $levels = ['bachelor' => 'Bachelor&rsquo;s', 'master' => 'Master&rsquo;s', 'phd' => 'Doctorate (PhD)'];
        $rows = '';
        $short = [];
        foreach ($levels as $level => $label) {
            if ($t = $this->tuition($level)) {
                $rows .= '<li><strong>'.$label.':</strong> median '.number_format($t['median']).' CNY a year; most programs between '.number_format($t['low']).' and '.number_format($t['high']).' CNY (from '.number_format($t['count']).' programs)</li>';
                $short[] = $label.' programs have a median of '.number_format($t['median']).' CNY a year';
            }
        }
        $tuitionBlock = $rows !== ''
            ? '<p>These figures are yearly tuition for English-taught programs in the CAS catalog that publish a fee. The range covers the middle 80% of programs:</p><ul>'.$rows.'</ul><p>The <a href="/site/pricing">costs and fees page</a> shows the same figures live, and each program page shows its own fee.</p>'
            : '<p>Tuition differs by university, level and subject. The <a href="/site/pricing">costs and fees page</a> shows typical yearly tuition from the catalog, and each program page shows its own fee.</p>';
        $photo = University::where('status', 'active')->whereNotNull('cover_credit')->where('cover_path', 'like', '/%')->orderBy('name')->first(['name', 'slug', 'city', 'cover_path', 'cover_credit']);

        return [
            'slug' => 'cost-of-studying-in-china-tuition-living-costs-and-budget',
            'title' => 'Cost of Studying in China: Tuition, Living Costs and How to Budget',
            'excerpt' => 'What it costs to study in China: yearly tuition from the live catalog, the costs beyond tuition, how scholarships change the total, and how to build a budget.',
            'category' => 'Study in China',
            'date' => '2026-11-21 12:00:00',
            'cover' => $this->cover($photo),
            'body' => '<p>The cost of studying in China has two parts: what the university charges, and what it costs to live there. Both differ widely by city, level and subject, so the useful question is not &ldquo;how much does it cost?&rdquo; but &ldquo;what will it cost for this program in this city?&rdquo; This guide shows what to count and where to find each number.</p>'
                .$this->summary(array_merge($short ? [implode('; ', $short).'.'] : [], [
                    'Beyond tuition, budget for accommodation, insurance, the visa and residence permit, flights and daily living.',
                    'Scholarships can pay tuition, accommodation or a living stipend, in full or in part.',
                    'Ask every university for its current fee notice in writing before you pay anything.',
                ]))
                .$this->figure($photo, 'A campus in China')
                .'<h2>How much is tuition in China?</h2>'.$tuitionBlock
                .'<p>Medicine and some other professional degrees cost more than the general figures. For those, see <a href="/site/mbbs-in-china-fees">MBBS in China fees</a>.</p>'
                .'<h2>What do you pay besides tuition?</h2><ul><li><strong>Accommodation:</strong> a university dormitory or private housing; the university page lists dormitory fees where they are published</li><li><strong>Medical insurance:</strong> required for international students and paid each year</li><li><strong>Application fee:</strong> charged by some universities when you apply</li><li><strong>Visa and residence permit:</strong> including the physical examination</li><li><strong>Books and materials:</strong> more for laboratory and clinical subjects</li><li><strong>Flights and daily living:</strong> food, transport, phone and personal costs in your city</li></ul><p>These costs are set by the university, by the city or by China, not by an agency.</p>'
                .'<h2>How much do living costs differ between cities?</h2><p>A great deal. The largest cities are the most expensive for rent, food and transport, and a provincial city can cost much less for the same standard of living. If your budget is tight, the choice of city can matter as much as the choice of university. Compare places on <a href="/site/cities">study in China by city</a>.</p>'
                .'<h2>How do scholarships change the cost?</h2><p>A full scholarship can cover tuition and accommodation and add a monthly stipend and insurance. A partial one covers some of these. Government, provincial and university schemes all exist, each with its own rules and deadlines. Start with the <a href="/site/csc-scholarship">CSC scholarship guide</a> and the <a href="/site/scholarships">scholarships list</a>, and apply early: scholarship windows usually close before self-funded ones.</p>'
                .'<h2>How do you build a budget?</h2><ol><li>Write down the tuition from the program page for each university on your shortlist</li><li>Add the dormitory fee and the insurance from the university page</li><li>Estimate monthly living costs for the city and multiply by the months you will be there</li><li>Add the one-off costs: application fee, visa, medical examination and flights</li><li>Subtract any scholarship you have been awarded in writing, not one you hope for</li><li>Keep a reserve for the first weeks, when deposits and set-up costs come together</li></ol>'
                .'<h2>What does CAS charge?</h2><p>The first consultation and the study plan are free. After that there is an application fee, plus document and service charges that depend on the university, program and degree. You get the amounts in writing before you pay. The <a href="/site/pricing">costs and fees page</a> lists what is included.</p>'
                .$this->faq([
                    ['Is it cheap to study in China?', 'It depends on the program and the city. Use the tuition on the program page and the living costs of the city to work out your own total.'],
                    ['Do tuition fees change during the degree?', 'Universities set fees year by year. Ask the university whether the fee in your admission notice applies for the whole degree.'],
                    ['Can I pay tuition in instalments?', 'Some universities allow payment by semester and some want the year in advance. Ask before you accept the offer.'],
                    ['Can I work to cover my costs?', 'Do not plan your budget around working. Student visas have strict rules on work, so ask the university&rsquo;s international office what is allowed.'],
                    ['What is the cheapest way to study in China?', 'A scholarship is the largest saving. After that, the choice of city usually makes more difference than the choice between similar universities.'],
                ])
                .self::NOTE.self::CTA,
        ];
    }
}

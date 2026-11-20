<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

/**
 * Articles for searches the site had no article for: engineering in China, dentistry (BDS), Chinese language
 * programs, the cost of studying in China, MBBS for Pakistani students, studying without IELTS, scholarships
 * for 2027 and the approved medical universities.
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
        return [
            $this->engineering(), $this->dentistry(), $this->language(), $this->costs(),
            $this->mbbsPakistan(), $this->withoutIelts(), $this->scholarships2027(), $this->medicalUniversities(),
        ];
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
            'date' => '2026-11-20 09:00:00',
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
            'date' => '2026-11-20 10:00:00',
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
            'date' => '2026-11-20 11:00:00',
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
            'date' => '2026-11-20 12:00:00',
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

    /** Universities on the Ministry of Education's approved list for English-taught MBBS. */
    private function approvedMbbs(): Collection
    {
        return University::query()->where('status', 'active')->where('moe_listed', true)->orderBy('name')
            ->get(['id', 'name', 'slug', 'city', 'province', 'cover_path', 'cover_credit', 'moe_mbbs_year']);
    }

    /** @return array<string, string> */
    private function mbbsPakistan(): array
    {
        $approved = $this->approvedMbbs();
        $year = $approved->pluck('moe_mbbs_year')->filter()->first();
        $withPhoto = $approved->first(fn ($u) => $u->cover_credit && str_starts_with((string) $u->cover_path, '/'));

        return [
            'slug' => 'mbbs-in-china-for-pakistani-students-what-to-check-before-you-apply',
            'title' => 'MBBS in China for Pakistani Students: What to Check First',
            'excerpt' => 'A checklist for Pakistani students planning MBBS in China: the approved university list, what PMDC decides, documents, costs and how to apply.',
            'category' => 'MBBS in China',
            'date' => '2026-11-20 13:00:00',
            'cover' => $this->cover($withPhoto),
            'body' => '<p>Many Pakistani students choose China for an MBBS because the degrees are taught in English and the universities are close to home. The decision has two sides: the university has to be allowed to teach you, and Pakistan has to accept the degree when you return. This guide sets out what to check on each side before you pay anything.</p>'
                .$this->summary([
                    'Only universities on China&rsquo;s Ministry of Education approved list may enrol international students in English-taught MBBS'.($year ? ' ('.e($year).')' : '').'; CAS lists '.$this->n($approved->count(), 'approved university', 'approved universities').'.',
                    'Whether you can practise in Pakistan is decided by the Pakistan Medical and Dental Council (PMDC), so read its current rules before you choose.',
                    'Collect slow documents early: attested certificates, the police character certificate and the medical examination.',
                    'Ask every university for its current fee notice in writing.',
                ])
                .$this->figure($withPhoto, 'A university approved for English-taught MBBS')
                .'<h2>Which universities can Pakistani students apply to?</h2><p>China&rsquo;s Ministry of Education publishes a list each year of the universities approved to enrol international students in English-taught MBBS. A university that is not on the list for your intake year may not recruit you for that program, whatever an agent or advertisement says. The list can change from year to year, so check it for the year you will enrol. Our <a href="/site/mbbs-in-china">MBBS in China page</a> shows the current list.</p>'
                .'<h2>What does PMDC decide?</h2><p>The Pakistan Medical and Dental Council sets the rules for Pakistani students who study medicine abroad: which foreign degrees it accepts, any entry test or minimum marks you need before you leave, and the licensing examination you sit when you return. These rules are Pakistan&rsquo;s, not the university&rsquo;s, and they change. Read the current notice on the PMDC website, and keep a copy of the rules that applied in the year you enrolled.</p>'
                .'<h2>What are the entry requirements?</h2><ul><li>FSc pre-medical or an equivalent certificate, with the marks the university sets</li><li>Proof of English where the university asks for it</li><li>The age limits the university sets</li><li>A valid passport, a medical examination record and a police character certificate</li></ul><p>Requirements differ by university. The program page on CAS shows what we have confirmed for each one.</p>'
                .'<h2>Which documents take the longest?</h2><ul><li>Attestation of your certificates by the board and the relevant ministries</li><li>The police character certificate</li><li>The medical examination on the form China uses for foreigners</li><li>A passport with enough validity for the visa</li></ul><p>Start these first: they do not depend on which university you choose.</p>'
                .'<h2>What does it cost?</h2><p>Count tuition, accommodation, insurance and living costs for each year, plus the one-off costs of the visa, the medical examination and flights. Fees are set year by year, so ask each university for the current notice. See <a href="/site/mbbs-in-china-fees">MBBS in China fees</a> and our guide to the <a href="/site/news/cost-of-studying-in-china-tuition-living-costs-and-budget">cost of studying in China</a>.</p>'
                .'<h2>Mistakes to avoid</h2><ul><li>Paying a deposit before the university has issued an admission notice</li><li>Trusting a &ldquo;seat guarantee&rdquo; at a university that is not on the approved list</li><li>Assuming last year&rsquo;s fee or PMDC rule still applies</li><li>Applying to one university only</li></ul>'
                .'<h2>Universities approved for English-taught MBBS</h2>'.$this->list($approved)
                .'<p>See also <a href="/site/mbbs-in-china-for-pakistani-students">MBBS in China for Pakistani students</a> and <a href="/site/news/mbbs-in-china-2027-how-to-prepare-and-apply">MBBS in China 2027: how to prepare and apply</a>.</p>'
                .$this->faq([
                    ['Is an MBBS from China accepted in Pakistan?', 'PMDC decides that, and its rules change. Check the current PMDC notice for foreign medical graduates before you apply.'],
                    ['Is MBBS in China taught in English?', 'The approved programs are taught in English. Universities add Chinese classes because clinical training involves talking to patients.'],
                    ['How many universities are approved?', 'CAS lists '.$this->n($approved->count(), 'university', 'universities').' on the Ministry of Education&rsquo;s approved list. The list is published each year.'],
                    ['When should I apply?', 'Most universities recruit for September, and each sets its own window. The program page shows the window we have confirmed.'],
                    ['Can I get a scholarship for MBBS?', 'Some scholarships are open to MBBS applicants and many are not. The <a href="/site/scholarships">scholarships page</a> shows what each one covers.'],
                ])
                .self::NOTE.self::CTA,
        ];
    }

    /** @return array<string, string> */
    private function withoutIelts(): array
    {
        $english = $this->programs()->where('teaching_language', 'English')->count();
        $match = fn ($q) => $q->where('status', 'active')->where('registry_only', false)->where('teaching_language', 'English');
        $unis = University::query()->where('status', 'active')->whereHas('programs', $match)->withCount(['programs as matching' => $match])
            ->orderByDesc('matching')->orderBy('name')->limit(20)->get(['id', 'name', 'slug', 'city', 'cover_path', 'cover_credit']);
        $withPhoto = $unis->first(fn ($u) => $u->cover_credit && str_starts_with((string) $u->cover_path, '/'));

        return [
            'slug' => 'study-in-china-without-ielts',
            'title' => 'Study in China Without IELTS: What Universities Accept',
            'excerpt' => 'Can you study in China without IELTS? How universities check English, the other kinds of proof some accept, and how to find out for your program.',
            'category' => 'Study in China',
            'date' => '2026-11-20 14:00:00',
            'cover' => $this->cover($withPhoto),
            'body' => '<p>IELTS is the test most students think of when a degree is taught in English, but it is not the only way Chinese universities check your English. Each university sets its own rule, and the rule can differ between programs at the same university. This guide explains what universities ask for and how to find out what applies to you.</p>'
                .$this->summary([
                    'There is no single national rule: each university decides what proof of English it accepts.',
                    'Some accept other evidence, such as a letter confirming your previous study was taught in English, another test, or their own interview.',
                    'CAS lists '.$this->n($english, 'program').' taught in English; the program page shows the requirement we have confirmed.',
                    'Chinese-taught degrees need an HSK certificate instead of an English test.',
                ])
                .$this->figure($withPhoto, 'A university with English-taught programs')
                .'<h2>Do Chinese universities require IELTS?</h2><p>Some do, some accept alternatives, and some decide case by case. A university wants to know that you can follow lectures and write examinations in English. A test score is the simplest proof, which is why many program pages mention IELTS or TOEFL, but it is the ability that matters to them, not one particular test.</p>'
                .'<h2>What other proof do universities accept?</h2><ul><li>A letter from your school or university confirming that your previous study was taught in English</li><li>Another English test the university names</li><li>An interview or a written test run by the university itself</li><li>Being a native speaker, or holding an earlier qualification from an English-speaking country</li></ul><p>Not every university accepts every one of these. Treat the list as questions to ask, not as a promise.</p>'
                .'<h2>How do you find out what your program needs?</h2><ol><li>Open the program page on CAS and read the requirements</li><li>If English proof is not stated, ask a CAS counselor to confirm it with the university</li><li>Get the answer in writing before you pay an application fee</li><li>Check again if you apply in a later year: requirements change</li></ol>'
                .'<h2>Does a scholarship change the requirement?</h2><p>It can. A scholarship has its own conditions on top of the university&rsquo;s, and some ask for a language certificate even where the university would accept a letter. Read the scholarship&rsquo;s own call. Start with our <a href="/site/csc-scholarship">CSC scholarship guide</a>.</p>'
                .'<h2>What about the visa?</h2><p>The student visa is issued on the university&rsquo;s admission notice and visa application form. Language proof is part of the university&rsquo;s admission decision, so settle it with the university. Our <a href="/site/news/china-x1-student-visa-guide">student visa guide</a> explains the visa steps.</p>'
                .'<h2>Is skipping the test a good idea?</h2><p>If you can take a test, a score helps: it widens the list of universities and scholarships you can apply to, and it removes a question from your file. If you cannot, choose universities that state clearly what they accept instead, and keep the written confirmation.</p>'
                .'<h2>Universities with the most English-taught programs</h2><p>From the CAS catalog:</p>'.$this->list($unis)
                .$this->faq([
                    ['Can I study in China without IELTS?', 'At some universities, yes. Each university decides what proof of English it accepts, so confirm it for your program in writing.'],
                    ['Is a medium-of-instruction letter enough?', 'Some universities accept a letter confirming your previous study was in English and some do not. Ask the university before you rely on it.'],
                    ['Do I need IELTS for MBBS in China?', 'The university sets the rule. Check the program page and confirm with the university; your own medical regulator may also have language rules.'],
                    ['Do I need English for a Chinese-taught degree?', 'No. A Chinese-taught degree needs the HSK level the university sets.'],
                    ['Does CAS check this for me?', 'A CAS counselor can confirm the language requirement with the university when preparing your application.'],
                ])
                .self::NOTE.self::CTA,
        ];
    }

    /** @return array<string, string> */
    private function scholarships2027(): array
    {
        $active = fn () => Scholarship::query()->where('status', 'active');
        $total = $active()->count();
        $government = $active()->where('scope', 'government')->orderBy('name')->get(['name', 'coverage']);
        $university = $active()->where('scope', 'university')->count();
        $unis = University::query()->where('status', 'active')->whereHas('scholarships', fn ($q) => $q->where('status', 'active'))
            ->withCount(['scholarships as matching' => fn ($q) => $q->where('status', 'active')])
            ->orderByDesc('matching')->orderBy('name')->limit(20)->get(['id', 'name', 'slug', 'city', 'cover_path', 'cover_credit']);
        $withPhoto = $unis->first(fn ($u) => $u->cover_credit && str_starts_with((string) $u->cover_path, '/'));
        $govList = $government->isNotEmpty()
            ? '<ul>'.$government->map(fn ($s) => '<li>'.e($s->name).($s->coverage ? ': '.e($s->coverage) : '').'</li>')->implode('').'</ul>'
            : '';

        return [
            'slug' => 'scholarships-in-china-2027-how-to-find-and-apply',
            'title' => 'Scholarships in China 2027: How to Find and Apply',
            'excerpt' => 'Planning to study in China on a scholarship in 2027? The kinds of awards, what they cover, when to start and how to apply, with the scholarships in our catalog.',
            'category' => 'Scholarships',
            'date' => '2026-11-20 15:00:00',
            'cover' => $this->cover($withPhoto),
            'body' => '<p>Scholarships are the largest saving available to an international student in China, and the students who win them are usually the ones who start early. Calls for a September intake open months before, and each scheme has its own rules. This guide explains the kinds of award and how to prepare for the 2027 intake.</p>'
                .$this->summary([
                    'CAS lists '.$this->n($total, 'active scholarship').': '.number_format($government->count()).' China-wide and '.number_format($university).' offered by universities.',
                    'Awards are full or partial: tuition, accommodation, a living stipend and insurance, or some of these.',
                    'Scholarship deadlines are usually earlier than self-funded ones, so prepare documents first.',
                    'Dates and rules for 2027 are set by each scheme; check the current call before you apply.',
                ])
                .$this->figure($withPhoto, 'A university that offers scholarships')
                .'<h2>What kinds of scholarship are there?</h2><ul><li><strong>Chinese Government Scholarship (CSC):</strong> funded nationally and applied for through an embassy or a host university</li><li><strong>Provincial and city scholarships:</strong> funded by a province or city for students at its universities</li><li><strong>University scholarships:</strong> funded by the university itself, often for new students with strong grades</li><li><strong>Scholarships for language study:</strong> awards aimed at students of Chinese</li></ul>'
                .($govList !== '' ? '<h2>Which China-wide scholarships does CAS list?</h2>'.$govList : '')
                .'<h2>What does a scholarship cover?</h2><p>A full scholarship can pay tuition and accommodation and add a monthly stipend and medical insurance. A partial scholarship pays some of these, most often part of the tuition. The page for each scholarship on CAS states what it covers; do not assume one scheme works like another.</p>'
                .'<h2>When should you start for 2027?</h2><ol><li><strong>Now:</strong> shortlist programs and read each scholarship&rsquo;s conditions</li><li><strong>Before the call opens:</strong> prepare certified transcripts, a study plan or research proposal, and recommendation letters</li><li><strong>When the call opens:</strong> apply to the scholarship and to the university, in the order the scheme requires</li><li><strong>After you apply:</strong> watch for interview requests and keep your documents ready</li></ol><p>The call for each scheme gives its own dates. Our article on <a href="/site/news/china-university-application-deadlines-2027-intakes">application deadlines for 2027 intakes</a> lists the windows we have confirmed.</p>'
                .'<h2>What makes an application strong?</h2><ul><li>Grades and a field of study that match the program</li><li>A study plan that says what you will study, why at that university, and what you will do afterwards</li><li>Recommendation letters from people who taught or supervised you</li><li>A complete file, submitted before the deadline rather than on it</li></ul>'
                .'<h2>Universities with the most scholarships in our catalog</h2>'.$this->list($unis)
                .'<p>Read next: the <a href="/site/csc-scholarship">CSC scholarship guide</a>, the <a href="/site/news/csc-scholarship-checklist-documents-and-timeline">CSC checklist</a> and the full <a href="/site/scholarships">scholarships list</a>.</p>'
                .$this->faq([
                    ['When do scholarships for 2027 open?', 'Each scheme sets its own dates. Calls for a September intake usually open months earlier, so check the current call for the scholarship you want.'],
                    ['Can I apply for more than one scholarship?', 'You can usually apply to several, but most schemes do not let you hold two awards at once. Read each scheme&rsquo;s rules.'],
                    ['Do scholarships cover living costs?', 'Full scholarships often include a monthly stipend; partial ones usually do not. The scholarship page states what is covered.'],
                    ['Do I need an admission letter first?', 'It depends on the scheme. Some want a pre-admission notice from the university and some run both steps together.'],
                    ['Does CAS help with scholarship applications?', 'Yes. A CAS counselor matches you to scholarships you qualify for and helps you prepare the application.'],
                ])
                .self::NOTE.self::CTA,
        ];
    }

    /** @return array<string, string> */
    private function medicalUniversities(): array
    {
        $approved = $this->approvedMbbs();
        $year = $approved->pluck('moe_mbbs_year')->filter()->first();
        $byProvince = $approved->groupBy(fn ($u) => $u->province ?: 'Other')->sortKeys();
        $withPhoto = $approved->first(fn ($u) => $u->cover_credit && str_starts_with((string) $u->cover_path, '/'));
        $grouped = $byProvince->map(fn ($unis, $province) => '<h3>'.e($province).'</h3>'.$this->list($unis))->implode('');

        return [
            'slug' => 'top-medical-universities-in-china-for-international-students',
            'title' => 'Top Medical Universities in China for International Students',
            'excerpt' => 'Which medical universities in China can international students choose? The Ministry of Education approved list by province, and how to compare them.',
            'category' => 'MBBS in China',
            'date' => '2026-11-20 16:00:00',
            'cover' => $this->cover($withPhoto),
            'body' => '<p>Search for the &ldquo;top&rdquo; medical universities in China and you will find many lists that disagree with each other. For an international student the first question is simpler: which universities are allowed to teach you medicine in English? This guide starts from that list and then explains how to compare the universities on it. CAS does not rank them.</p>'
                .$this->summary([
                    'The list that matters is the Ministry of Education&rsquo;s approved list for English-taught MBBS'.($year ? ' ('.e($year).')' : '').': '.$this->n($approved->count(), 'university', 'universities').' in the CAS catalog.',
                    'They are spread across '.$this->n($byProvince->count(), 'province').' and regions, so the choice of city matters.',
                    'Compare the teaching hospital, the fees, the city and your own regulator&rsquo;s rules, not a league-table position.',
                    'The list is published each year; check it for the year you will enrol.',
                ])
                .$this->figure($withPhoto, 'A university approved for English-taught MBBS')
                .'<h2>Which medical universities can international students choose?</h2><p>China&rsquo;s Ministry of Education approves a set of universities each year to enrol international students in English-taught MBBS (Clinical Medicine). Only those universities may recruit for that program. The list is the right starting point because it is an official permission, not an opinion.</p>'
                .'<h2>Approved universities by province</h2>'.$grouped
                .'<h2>How should you compare them?</h2><ul><li><strong>Teaching hospital:</strong> where you will do your clinical years, and how the internship is arranged for international students</li><li><strong>Language support:</strong> the Chinese classes that prepare you to talk to patients</li><li><strong>Fees:</strong> tuition, accommodation and insurance from the current notice</li><li><strong>City:</strong> climate, living costs and how easy it is to travel home</li><li><strong>Your regulator:</strong> whether your own medical council accepts the degree, and on what conditions</li></ul>'
                .'<h2>Do rankings matter?</h2><p>International league tables measure research output and reputation across a whole university. They say little about how medicine is taught to international students, and a higher-ranked university is not automatically a better choice for you. Use rankings as one input at most, after the checks above.</p>'
                .'<h2>What about dentistry and Chinese medicine?</h2><p>The approved list covers English-taught MBBS only. Dentistry and Traditional Chinese Medicine are separate degrees with their own entry rules. Read our guides to <a href="/site/news/bds-in-china-dentistry-for-international-students">BDS in China</a> and <a href="/site/news/study-medicine-in-china-mbbs-bds-tcm">studying medicine in China: MBBS, BDS and TCM</a>.</p>'
                .'<h2>How do you apply?</h2><ol><li>Shortlist three or four approved universities</li><li>Check your own regulator&rsquo;s rules for each</li><li>Ask each university for its current requirements and fee notice</li><li>Apply online through CAS before the window closes</li></ol><p>See <a href="/site/mbbs-in-china">MBBS in China</a> for the list with fees and dates, and <a href="/site/mbbs-in-china-admission-requirements">admission requirements</a>.</p>'
                .$this->faq([
                    ['Which is the best medical university in China?', 'There is no single answer, and CAS does not rank them. Start from the approved list and compare the teaching hospital, fees, city and your regulator&rsquo;s rules.'],
                    ['How many medical universities in China teach MBBS in English?', 'CAS lists '.$this->n($approved->count(), 'university', 'universities').' on the Ministry of Education&rsquo;s approved list for English-taught MBBS.'],
                    ['Does the approved list change?', 'Yes. It is published each year, so confirm it for the year you will enrol.'],
                    ['Is a university that is not on the list a bad university?', 'Not necessarily. It may teach medicine in Chinese or teach other subjects. It simply may not recruit international students for English-taught MBBS.'],
                    ['Do these universities also offer scholarships?', 'Some do. The <a href="/site/scholarships">scholarships page</a> shows what is available at each university.'],
                ])
                .self::NOTE.self::CTA,
        ];
    }
}

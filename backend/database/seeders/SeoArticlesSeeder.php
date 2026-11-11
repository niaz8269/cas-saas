<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\University;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Search-focused articles for CAS's main topics: MBBS in China (2026 and 2027), medicine, master's and PhD
 * study, scholarships and CSC, studying in China, and choosing a city.
 *
 * Written in the same spirit as GuidesSeeder: original explainers, no invented figures. Fees and deadlines
 * change every year, so the articles point to the live catalog pages instead of quoting numbers, and the
 * university lists, photos and credits are built from the catalog.
 *
 * Idempotent: keyed on slug.
 */
class SeoArticlesSeeder extends Seeder
{
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

    /** Universities that have a campus photo (and its credit), one per city, from a catalog query. */
    private function withPhotos(Builder $query, int $n, int $skip = 0): Collection
    {
        return $query->whereNotNull('cover_path')->where('cover_path', 'like', '/%')
            ->whereNotNull('cover_credit')
            ->orderBy('name')->get(['name', 'slug', 'city', 'cover_path', 'cover_credit'])
            ->unique('city')->slice($skip)->take($n)->values();
    }

    /** A credited photo with a descriptive alt text. */
    private function figure(?University $u, string $what): string
    {
        if (! $u) {
            return '';
        }

        return '<figure><img src="'.e($u->cover_path).'" alt="'.e($what.': '.$u->name.', '.$u->city.', China').'" loading="lazy" />'
            .'<figcaption>'.e($what).': <a href="/site/universities/'.e($u->slug).'">'.e($u->name).'</a>, '.e($u->city).'. Photo: '.e($u->cover_credit).'</figcaption></figure>';
    }

    private function cover(?University $u): string
    {
        return $u?->cover_path ?? '/images/header-default-v3.webp';
    }

    private function list(Collection $unis): string
    {
        return '<ul>'.$unis->map(fn ($u) => '<li><a href="/site/universities/'.e($u->slug).'">'.e($u->name).'</a> ('.e($u->city).')</li>')->implode('').'</ul>';
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

    private function mbbsUniversities(): Collection
    {
        return University::where('moe_listed', true)
            ->whereHas('programs', fn ($q) => $q->where('registry_only', false)->where('teaching_language', 'English')->where('name', 'like', '%MBBS%'))
            ->orderBy('name')->get(['name', 'slug', 'city', 'cover_path', 'cover_credit']);
    }

    private function universitiesTeaching(string $level): Collection
    {
        return University::where('status', 'active')
            ->whereHas('programs', fn ($q) => $q->where('registry_only', false)->where('level', $level)->where('teaching_language', 'English'))
            ->withCount(['programs as level_programs' => fn ($q) => $q->where('registry_only', false)->where('level', $level)->where('teaching_language', 'English')])
            ->orderByDesc('level_programs')->orderBy('name')->get(['name', 'slug', 'city', 'cover_path', 'cover_credit']);
    }

    private const CHECKED = '<p><em>Checked against official university and Ministry of Education pages in November 2026. Rules, fees and dates change from year to year, so confirm the details for your intake with the university and your own regulator.</em></p>';

    private const CTA = '<h2>Need help choosing?</h2><p>CAS is an authorized agent that places international students into Chinese universities. <a href="/site/study-plan">Get a free study plan</a>, <a href="/site/contact">talk to a counselor</a>, or see <a href="/site/services">everything we do for students</a>.</p>';

    // ── the articles ────────────────────────────────────────────────────────

    /** @return list<array<string, string>> */
    private function articles(): array
    {
        $mbbs = $this->mbbsUniversities();
        $mbbsPhotos = $this->withPhotos(University::query()->whereIn('slug', $mbbs->pluck('slug')), 12);
        $master = $this->universitiesTeaching('master')->take(24);
        $phd = $this->universitiesTeaching('phd')->take(24);
        $any = $this->withPhotos(University::query()->where('status', 'active'), 30, 6);
        $cities = University::where('status', 'active')->whereNotNull('city')->selectRaw('city, count(*) as total')->groupBy('city')->orderByDesc('total')->limit(8)->get();
        $cityPhotos = $cities->map(fn ($c) => University::where('city', $c->city)->where('status', 'active')->whereNotNull('cover_path')->where('cover_path', 'like', '/%')->whereNotNull('cover_credit')->first(['name', 'slug', 'city', 'cover_path', 'cover_credit']));

        $m = fn (int $i): ?University => $mbbsPhotos->get($i);
        $a = fn (int $i): ?University => $any->get($i);

        return [
            // 1 ─ MBBS in China 2026
            [
                'slug' => 'mbbs-in-china-2026-admission-guide',
                'title' => 'MBBS in China 2026: Admission Guide for Students',
                'excerpt' => 'Who may offer English-taught MBBS in China for 2026–27, what you need to apply, how long it takes, and how to check recognition before you pay.',
                'category' => 'MBBS in China',
                'date' => '2026-11-08 09:00:00',
                'cover' => $this->cover($m(0)),
                'body' => '<p>MBBS in China 2026 is one of the most searched routes for students who want a medical degree abroad. This guide explains how the route works for the 2026&ndash;27 intake, who is allowed to enrol you, and what to check before you commit.</p>'
                    .$this->summary([
                        'The degree is officially <strong>Clinical Medicine</strong>; the English-taught version is marketed as MBBS.',
                        'Only universities on the Ministry of Education&rsquo;s annual list may recruit English-taught MBBS students. For 2026&ndash;27 that list has 43 universities.',
                        'English-taught programmes in our catalog run six years, including clinical training and internship.',
                        'Most universities recruit once a year, for September.',
                        'Whether the degree lets you practise at home depends on <em>your</em> national regulator. Check that first.',
                    ])
                    .$this->figure($m(0), 'A medical university campus')
                    .'<h2>What the Ministry list means for you</h2><p>China limits which universities may enrol international students in English-taught undergraduate medicine. The Ministry of Education publishes the approved list every year. If a university is not on it, it may not recruit English-taught MBBS students, however attractive its fees or promises. That is why the first thing to do with any MBBS offer is to check the university against the list. Read the <a href="/site/news/moe-approves-43-universities-english-mbbs-2026-27">Ministry announcement and the full list</a>, or see our <a href="/site/mbbs-in-china">MBBS in China page</a>, where approved universities are marked.</p>'
                    .'<h2>Which universities can enrol you in 2026&ndash;27</h2><p>These are the approved universities in the CAS catalog that offer English-taught MBBS:</p>'
                    .$this->list($mbbs)
                    .'<h2>How to choose between approved universities</h2><p>Once a university is approved, compare it on what affects your six years:</p><ul><li><strong>Teaching hospitals:</strong> where you will train, and how far they are from campus</li><li><strong>City and climate:</strong> cost of living, winters, and the number of international students</li><li><strong>Class size and support:</strong> how many students per class, and who helps with Chinese classes</li><li><strong>Fees and what they include:</strong> ask for a written notice that covers all six years</li><li><strong>Accommodation:</strong> on campus or off, and the cost</li><li><strong>Application window:</strong> some close earlier than others</li></ul>'
                    .$this->figure($m(4), 'Another approved MBBS university')
                    .'<h2>Admission requirements</h2><ul><li>High-school completion with strong results in biology and chemistry, usually physics as well</li><li>Valid passport and a criminal record certificate</li><li>Evidence of English if your schooling was not in English; each university states which test it accepts</li><li>A medical examination on the official foreigner form</li><li>An age limit at some universities; check the programme page</li></ul>'
                    .'<h2>Hospital training and internship</h2><p>The first years are mostly classroom and laboratory teaching. Clinical teaching in hospitals follows, ending with an internship. Patients mostly speak Chinese, so universities add Chinese-language classes for the clinical years. Ask each university how many hours of Chinese you will study and who teaches clinical subjects.</p>'
                    .'<h2>Fees: how to compare universities</h2><p>Tuition, accommodation, insurance and clinical-training charges differ by university and city and change every year, so we do not quote one &ldquo;MBBS fee&rdquo;. Open each programme page for the current figure, then ask for a written fee notice. Use this table when you compare:</p>'
                    .'<table><thead><tr><th>Cost</th><th>What to ask the university</th></tr></thead><tbody>'
                    .'<tr><td>Tuition</td><td>Is it the same for all six years, and in which currency?</td></tr>'
                    .'<tr><td>Accommodation</td><td>Is it included, and what room type does the price cover?</td></tr>'
                    .'<tr><td>Insurance</td><td>Is health insurance compulsory, and what does it cost per year?</td></tr>'
                    .'<tr><td>Clinical training</td><td>Are there extra charges for hospital rotations or internship?</td></tr>'
                    .'<tr><td>One-off costs</td><td>Application fee, medical examination, visa and residence permit</td></tr></tbody></table>'
                    .'<h2>Recognition: check this before you pay anything</h2><p>A Chinese medical degree is useful only if your home country lets you practise with it. National regulators set their own rules, which can include a screening or licensing exam for graduates of foreign universities, and in some countries an entrance test before you may study medicine abroad. Read your regulator&rsquo;s current notice first, then confirm that the university and programme are on the Ministry list.</p>'
                    .'<h2>How to apply, step by step</h2><ol><li>Check your regulator&rsquo;s rules for studying medicine abroad.</li><li>Shortlist universities from the approved list and read each programme page.</li><li>Check the application window and prepare your documents.</li><li>Submit the online application and pay only the stated application fee.</li><li>Receive the admission notice and the visa application form (JW201 or JW202).</li><li>Apply for the X1 student visa; see our <a href="/site/news/china-x1-student-visa-guide">X1 visa guide</a>.</li><li>Travel, register and convert your visa into a residence permit.</li></ol>'
                    .'<h2>Mistakes to avoid</h2><ul><li>Choosing a university because it is cheap, without checking it is on the approved list</li><li>Trusting anyone who guarantees admission or a scholarship</li><li>Skipping the recognition check for your own country</li><li>Missing the one application window of the year</li><li>Paying large amounts before you have a written fee notice and an admission notice</li></ul>'
                    .$this->faq([
                        ['Is MBBS in China valid in my country?', 'It depends on your national medical regulator, not on China. Check its current rules for graduates of foreign universities before you apply.'],
                        ['Is the whole programme taught in English?', 'Lectures are in English, but hospital training involves patients who speak Chinese, so universities add Chinese-language classes. Ask how much.'],
                        ['How many years is MBBS in China?', 'The English-taught programmes in our catalog run six years, including clinical training and internship. The programme page shows the duration for each university.'],
                        ['Can I apply for a scholarship for MBBS?', 'Some universities and government schemes offer scholarships to medical students. See <a href="/site/scholarships">scholarships</a> and our <a href="/site/news/scholarship-guidance-how-to-choose-and-apply">scholarship guidance</a>.'],
                        ['What if I want to start in 2027 instead?', 'Read our guide to <a href="/site/news/mbbs-in-china-2027-how-to-prepare-and-apply">MBBS in China 2027</a>.'],
                        ['Is a university outside the approved list safe?', 'It may not recruit English-taught MBBS students at all. Treat any such offer with great caution and verify it with the Ministry list.'],
                    ])
                    .self::CHECKED.self::CTA,
            ],

            // 2 ─ MBBS in China 2027
            [
                'slug' => 'mbbs-in-china-2027-how-to-prepare-and-apply',
                'title' => 'MBBS in China 2027: How to Prepare and Apply',
                'excerpt' => 'Planning MBBS in China 2027? A month-by-month preparation plan, the documents to collect early, and how to check the approved list for your year.',
                'category' => 'MBBS in China',
                'date' => '2026-11-08 09:30:00',
                'cover' => $this->cover($m(1)),
                'body' => '<p>If you plan to study medicine in China in 2027, the best time to start is now. Good preparation is the difference between choosing calmly and rushing a decision in the last weeks before an application window closes.</p>'
                    .$this->summary([
                        'The approved-university list is published every year; confirm it for the year you enrol.',
                        'Start 12 months ahead: regulator rules, documents, English, then applications.',
                        'Collect slow documents first, such as the criminal record certificate and certified transcripts.',
                        'Never pay large sums before you hold an admission notice and a written fee notice.',
                    ])
                    .$this->figure($m(1), 'Where MBBS students study')
                    .'<h2>How MBBS in China 2027 differs from 2026</h2><p>The Ministry of Education publishes its list of universities approved to recruit English-taught MBBS students every year, and the list can change. A university that recruited in 2026 is not automatically approved for 2027. On CAS, approved universities are marked, and we update our <a href="/site/mbbs-in-china">MBBS in China page</a> when the Ministry publishes a new list. For this year&rsquo;s picture, read our <a href="/site/news/mbbs-in-china-2026-admission-guide">MBBS in China 2026 guide</a>.</p>'
                    .'<h2>A preparation timeline</h2><h3>12 to 9 months before you enrol</h3><ul><li>Read your national regulator&rsquo;s rules for studying medicine abroad</li><li>Check subject and grade requirements with your school</li><li>Start any exam or English-language preparation your route needs</li></ul>'
                    .'<h3>9 to 6 months before</h3><ul><li>Shortlist universities and compare programme pages</li><li>Order certified copies of certificates and transcripts</li><li>Request a criminal record certificate; it can take weeks</li></ul>'
                    .'<h3>6 to 3 months before</h3><ul><li>Watch for application windows to open and apply early</li><li>Complete the medical examination on the official foreigner form</li><li>Ask for a written fee notice from every university you apply to</li></ul>'
                    .'<h3>3 months before to departure</h3><ul><li>Receive the admission notice and visa application form</li><li>Apply for the X1 visa (see our <a href="/site/news/china-x1-student-visa-guide">visa guide</a>)</li><li>Plan travel and your first weeks in China</li></ul>'
                    .$this->figure($m(5), 'A campus to consider for 2027')
                    .'<h2>Documents to collect early</h2><ul><li>Passport with long validity</li><li>High-school certificate and transcripts</li><li>English-language evidence where needed</li><li>Criminal record certificate</li><li>Medical examination record</li><li>Passport-style photographs</li></ul>'
                    .'<h2>Budgeting for MBBS in China 2027</h2><p>Think in four groups: tuition, accommodation, living costs and insurance, plus one-off visa and medical costs. Universities publish fees for the coming year late, so use today&rsquo;s programme pages as a guide and ask each university for the current notice before you decide. Our 2026 guide has a <a href="/site/news/mbbs-in-china-2026-admission-guide">table of the questions to ask about every cost</a>.</p>'
                    .'<h2>What to do while you wait for the 2027 announcements</h2><ul><li>Prepare documents, because they do not depend on the list</li><li>Shortlist several universities rather than one</li><li>Join a free consultation to review your options and timeline</li><li>Track application windows on our programme pages</li></ul>'
                    .'<h2>Mistakes students make when planning early</h2><ul><li>Paying a &ldquo;reservation fee&rdquo; before the university has confirmed the intake</li><li>Relying on last year&rsquo;s fee and date as if they will repeat</li><li>Applying to a single university with no back-up</li><li>Leaving the criminal record certificate to the end</li></ul>'
                    .'<h2>Universities to look at now</h2>'.$this->list($mbbs)
                    .$this->faq([
                        ['When do applications for 2027 open?', 'Each university sets its own window, and most recruit for September. Our programme pages show the window we have confirmed.'],
                        ['Should I wait for the 2027 list before applying?', 'You can prepare now. Apply only to universities that are on the approved list for the year you enrol.'],
                        ['Can I start MBBS in China in 2027 if I finish school this year?', 'Usually yes, if you meet the programme and regulator requirements. Your final certificate may arrive late, so ask the university how it handles that.'],
                        ['Is 2027 a good year to apply?', 'No year is better in itself. What matters is choosing an approved university, meeting your regulator&rsquo;s rules and applying on time.'],
                    ])
                    .self::CHECKED.self::CTA,
            ],

            // 3 ─ Study medicine in China
            [
                'slug' => 'study-medicine-in-china-mbbs-bds-tcm',
                'title' => 'Study Medicine in China: MBBS, BDS, TCM and More',
                'excerpt' => 'The medical programmes international students can take in China, what each one is, and the recognition questions to answer before you choose.',
                'category' => 'MBBS in China',
                'date' => '2026-11-09 09:00:00',
                'cover' => $this->cover($m(2)),
                'body' => '<p>When people search for how to study medicine in China, they usually mean MBBS. China teaches several other health programmes to international students, and each follows different rules. This guide compares them so you can pick the right one.</p>'
                    .$this->summary([
                        'English-taught MBBS is allowed only at universities on the Ministry of Education&rsquo;s approved list.',
                        'Dentistry (Stomatology/BDS), Traditional Chinese Medicine, nursing and pharmacy are separate programmes with their own rules.',
                        'Recognition of any health degree depends on the regulator in your own country.',
                    ])
                    .$this->figure($m(2), 'A university with a medical school')
                    .'<h2>Clinical Medicine (MBBS)</h2><p>The degree to become a doctor. English-taught undergraduate Clinical Medicine may only be offered by universities on the approved list. See our <a href="/site/mbbs-in-china">MBBS in China page</a> and the <a href="/site/news/mbbs-in-china-2026-admission-guide">MBBS in China 2026 guide</a>.</p>'
                    .'<h2>Stomatology (BDS)</h2><p>The dental degree. Many universities list it as Stomatology, sold abroad as BDS. Check its duration, teaching language and recognition on each programme page.</p>'
                    .'<h2>Traditional Chinese Medicine</h2><p>Programmes in Traditional Chinese Medicine, acupuncture and related fields. Recognition outside China varies widely, so confirm that your regulator accepts the qualification before you enrol.</p>'
                    .'<h2>Nursing, pharmacy and public health</h2><p>Programmes at bachelor, master and PhD level in nursing, pharmacy and related health sciences. Teaching language and requirements differ by university.</p>'
                    .'<h2>Postgraduate medicine</h2><p>Master&rsquo;s and PhD study in medical subjects is available at many universities, often with research funding. Read our guides to a <a href="/site/news/masters-in-china-for-international-students">master&rsquo;s in China</a> and a <a href="/site/news/phd-in-china-for-international-students">PhD in China</a>.</p>'
                    .'<h2>How the programmes compare</h2><table><thead><tr><th>Programme</th><th>Leads to</th><th>Check first</th></tr></thead><tbody><tr><td>Clinical Medicine (MBBS)</td><td>Medical doctor</td><td>Approved list, regulator rules</td></tr><tr><td>Stomatology (BDS)</td><td>Dentist</td><td>Dental regulator rules</td></tr><tr><td>Traditional Chinese Medicine</td><td>TCM practitioner</td><td>Whether your country recognises it</td></tr><tr><td>Nursing</td><td>Nurse</td><td>Nursing council rules</td></tr><tr><td>Pharmacy</td><td>Pharmacist</td><td>Pharmacy council rules</td></tr></tbody></table>'
                    .$this->figure($m(6), 'Another university for medical study')
                    .'<h2>Clinical training and language</h2><p>Every clinical programme involves time in hospitals or clinics, where patients usually speak Chinese. Ask how your university supports you with Chinese in clinical years, and how many hours of practice you receive.</p>'
                    .'<h2>Five questions to answer before you choose</h2><ol><li>Does my regulator recognise this degree for practice at home?</li><li>Is the university on the Ministry list for my year?</li><li>What is the teaching language, including in hospital?</li><li>What does the written fee notice include?</li><li>How long does the whole programme take, including internship?</li></ol>'
                    .'<h2>Medical programmes in our catalog</h2><p>Browse <a href="/site/programs?q=Medicine">medicine programmes</a>, <a href="/site/programs?q=MBBS">MBBS programmes</a> and <a href="/site/universities?moe=1">approved MBBS universities</a>.</p>'
                    .$this->faq([
                        ['Which medical course is best to study in China?', 'There is no single best. Choose the profession you want, then check that your national regulator recognises the programme.'],
                        ['Can I study dentistry in China in English?', 'Some universities teach Stomatology (BDS) in English. Check the programme page for the language and duration.'],
                        ['Do I need Chinese for medical study in China?', 'You can start in English, but hospital training is easier with Chinese. Most universities include language classes.'],
                    ])
                    .self::CHECKED.self::CTA,
            ],

            // 4 ─ Master's
            [
                'slug' => 'masters-in-china-for-international-students',
                'title' => 'Master\'s in China for International Students',
                'excerpt' => 'How a master\'s degree in China works: length, language options, requirements, scholarships and the steps to apply, with English-taught universities to start from.',
                'category' => 'Master & PhD',
                'date' => '2026-11-09 09:30:00',
                'cover' => $this->cover($a(0)),
                'body' => '<p>A master&rsquo;s in China combines internationally recognised universities with tuition that is often lower than in other major study destinations, and many programmes are taught in English. Here is how to approach it, from choosing a subject to arriving on campus.</p>'
                    .$this->summary([
                        'Most master&rsquo;s programmes take two to three years.',
                        'English-taught programmes are easier to enter; Chinese-taught ones offer far more choice and scholarships.',
                        'You usually need a bachelor degree, transcripts, a study plan and recommendation letters.',
                        'Scholarship deadlines are often earlier than admission deadlines.',
                    ])
                    .$this->figure($a(0), 'A university offering master&rsquo;s programmes')
                    .'<h2>How long does a master&rsquo;s take?</h2><p>Most master&rsquo;s programmes take two to three years, depending on the subject and on whether the degree is course-based or research-based. The programme page shows the duration for each course.</p>'
                    .'<h2>Academic and professional master&rsquo;s degrees</h2><ul><li><strong>Academic (research-oriented):</strong> centred on a thesis and a supervisor; the usual route to a PhD.</li><li><strong>Professional:</strong> focused on practice in fields such as business, engineering or public health.</li></ul>'
                    .'<h2>English-taught or Chinese-taught?</h2><ul><li><strong>English-taught:</strong> easier to enter, with a more limited range of subjects. Expect to show English evidence if your first degree was not in English.</li><li><strong>Chinese-taught:</strong> a much wider choice and more scholarships, but you need Chinese results, often HSK 4 or higher.</li></ul>'
                    .'<h2>Typical admission requirements</h2><ul><li>A bachelor degree in a related field, with transcripts</li><li>A study plan describing your goals and field</li><li>Two recommendation letters, usually from professors</li><li>Language evidence for the teaching language</li><li>Passport and a medical examination record</li></ul>'
                    .'<h2>Scholarships for a master&rsquo;s</h2><p>The Chinese Government Scholarship (CSC), provincial government awards and many university scholarships are open to master&rsquo;s students. Read our <a href="/site/news/csc-scholarship-guide-how-to-apply">CSC guide</a>, the <a href="/site/news/csc-scholarship-checklist-documents-and-timeline">CSC checklist</a> and <a href="/site/news/scholarship-guidance-how-to-choose-and-apply">scholarship guidance</a>, and browse <a href="/site/scholarships">scholarships</a>.</p>'
                    .$this->figure($a(1), 'Where master&rsquo;s students study')
                    .'<h2>Universities with English-taught master&rsquo;s programmes</h2><p>A starting list from the CAS catalog, ordered by the number of English-taught master&rsquo;s programmes. See them all in the <a href="/site/programs?level=master&amp;language=English">programme finder</a>.</p>'
                    .$this->list($master->take(16))
                    .'<h2>Planning your costs</h2><p>Budget for tuition, accommodation, living costs and health insurance, plus the visa and medical examination. Scholarships can cover some or all of these. Compare current figures on each programme page and ask the university for a written fee notice.</p>'
                    .'<h2>A timeline for applying</h2><ol><li>Choose your subject and compare programme pages.</li><li>Check the application window and the scholarship deadline, which can be earlier.</li><li>Write a focused study plan for each university.</li><li>Ask your referees early.</li><li>Submit the online application and track it until you receive the admission notice.</li><li>Apply for the visa; see the <a href="/site/news/china-x1-student-visa-guide">X1 visa guide</a>.</li></ol>'
                    .$this->faq([
                        ['Can I do a master\'s in China without Chinese?', 'Yes, if you choose an English-taught programme. Some students still add Chinese classes to make daily life easier.'],
                        ['Do I need work experience?', 'Most programmes ask for a bachelor degree and a study plan. A few professional programmes prefer experience; the programme page says so.'],
                        ['Can I get a scholarship for a master\'s in China?', 'Yes, through government, provincial and university schemes. Start early, because deadlines are often before general admission.'],
                        ['Is a master\'s from China recognised abroad?', 'Recognition depends on the country and on the university. Check the rules where you plan to work or continue to a PhD.'],
                    ])
                    .self::CHECKED.self::CTA,
            ],

            // 5 ─ PhD
            [
                'slug' => 'phd-in-china-for-international-students',
                'title' => 'PhD in China for International Students: Guide',
                'excerpt' => 'How to get a PhD in China: finding a supervisor, the research proposal, funding options, length of study and the steps to apply.',
                'category' => 'Master & PhD',
                'date' => '2026-11-10 09:00:00',
                'cover' => $this->cover($a(2)),
                'body' => '<p>A PhD in China puts you in well-funded laboratories and research groups, often with a scholarship that covers study costs. The application works differently from a master&rsquo;s: your supervisor matters as much as the university.</p>'
                    .$this->summary([
                        'A PhD usually takes three to four years, sometimes longer.',
                        'Many universities expect a supervisor to agree to take you before you are accepted.',
                        'You need a master degree, a research proposal, recommendation letters and a CV.',
                        'Funding exists through CSC, provincial and university scholarships; deadlines are early.',
                    ])
                    .$this->figure($a(2), 'A research university')
                    .'<h2>How long does a PhD take?</h2><p>A PhD in China usually takes three to four years, and sometimes longer depending on the field and the university&rsquo;s rules. Check the programme page for the standard length.</p>'
                    .'<h2>Step 1: find a supervisor</h2><p>Many universities expect you to have a supervisor who agrees to take you before the university accepts you. Look for professors whose published research matches yours, then write a short, specific email with your CV and research idea. Generic mass emails are ignored.</p>'
                    .'<h3>What a good first email contains</h3><ul><li>Who you are, in two sentences</li><li>Which of the professor&rsquo;s papers you read and what you want to build on</li><li>Your research idea in a short paragraph</li><li>Your CV and degree transcripts attached</li><li>Whether you plan to apply for a scholarship</li></ul>'
                    .'<h2>Step 2: write the research proposal</h2><ul><li>A clear question and why it matters</li><li>The methods you will use</li><li>How your background prepares you</li><li>Why this university and this supervisor</li></ul>'
                    .$this->figure($a(3), 'A university with research laboratories')
                    .'<h2>Typical requirements</h2><ul><li>A master degree in a related field, with transcripts</li><li>A research proposal and CV</li><li>Two or three recommendation letters</li><li>Evidence of publications for some fields</li><li>Language evidence for the teaching language</li></ul>'
                    .'<h2>Funding a PhD in China</h2><p>Options include the Chinese Government Scholarship (CSC), provincial scholarships and university scholarships, some of which cover tuition, accommodation and a monthly stipend. Amounts differ by programme and year. Read our <a href="/site/news/csc-scholarship-guide-how-to-apply">CSC guide</a> and <a href="/site/news/csc-scholarship-checklist-documents-and-timeline">checklist</a>.</p>'
                    .'<h2>Life as a PhD student</h2><p>Expect regular meetings with your supervisor, laboratory or group duties and a publication requirement set by the university or department. Ask your future supervisor what is expected before you accept.</p>'
                    .'<h2>Universities with English-taught PhD programmes</h2><p>From the CAS catalog; see them all in the <a href="/site/programs?level=phd&amp;language=English">programme finder</a>.</p>'
                    .$this->list($phd->take(16))
                    .$this->faq([
                        ['Do I need to publish papers before applying?', 'It depends on the field and the university. Publications strengthen an application but are not always required.'],
                        ['Can I get a PhD scholarship in China?', 'Yes, several routes exist, with deadlines that are often earlier than ordinary admission. Start early.'],
                        ['Do I need a master degree first?', 'Most PhD programmes require one. Some universities offer combined master&rsquo;s-and-doctoral routes; check the programme page.'],
                        ['Can I do a PhD in English in China?', 'Yes. Many universities have English-taught doctoral programmes, especially in science and engineering.'],
                    ])
                    .self::CHECKED.self::CTA,
            ],

            // 6 ─ Scholarship guidance
            [
                'slug' => 'scholarship-guidance-how-to-choose-and-apply',
                'title' => 'Scholarship Guidance: How to Choose and Apply',
                'excerpt' => 'Scholarship guidance for studying in China: how to tell scholarship types apart, check eligibility, build a strong application and avoid scams.',
                'category' => 'Scholarships',
                'date' => '2026-11-10 09:30:00',
                'cover' => $this->cover($a(4)),
                'body' => '<p>The right scholarship can decide whether studying in China is affordable. The hard part is not finding scholarships; it is choosing the right ones and applying well. This is our step-by-step guidance.</p>'
                    .$this->summary([
                        'Decide your level, subject and how much funding you need.',
                        'Learn the types: full, partial; government, provincial, university.',
                        'Check eligibility honestly and work backwards from the deadline.',
                        'Awards cannot be bought. Never pay anyone to guarantee one.',
                    ])
                    .$this->figure($a(4), 'A campus that welcomes international students')
                    .'<h2>Step 1: know what you need</h2><p>Decide your level (bachelor, master, PhD or language study), your subject and whether you need a full award or can cover part of the cost. This decides which scholarships are realistic.</p>'
                    .'<h2>Step 2: understand the types</h2><ul><li><strong>Full scholarships</strong> cover tuition and usually accommodation and a monthly stipend.</li><li><strong>Partial scholarships</strong> reduce tuition or cover part of the costs.</li><li><strong>Government, provincial and university awards</strong> have different owners, rules and deadlines.</li></ul>'
                    .'<p>Browse <a href="/site/scholarships?type=full">full scholarships</a> and <a href="/site/scholarships?type=partial">partial scholarships</a> in our catalog.</p>'
                    .'<h2>Step 3: check eligibility honestly</h2><p>Look at nationality, age limits, previous degree, grades and language. If you do not meet a rule, do not apply and hope; use the time on a scholarship you can win.</p>'
                    .'<h2>Step 4: read the notice like a checklist</h2><p>Every scholarship notice answers the same questions. Copy them into a table and fill in the answers before you do anything else.</p>'
                    .'<table><thead><tr><th>Question</th><th>Where to find it</th></tr></thead><tbody><tr><td>Who may apply?</td><td>Eligibility section</td></tr><tr><td>What does it cover?</td><td>Coverage section</td></tr><tr><td>Where do I apply?</td><td>Application channel</td></tr><tr><td>What is the deadline?</td><td>Notice or university page</td></tr><tr><td>Which documents?</td><td>Documents list</td></tr></tbody></table>'
                    .'<h2>Step 5: work backwards from the deadline</h2><p>Scholarship deadlines are often earlier than general admission deadlines. Start gathering documents several months before, and build in time for certified copies and referees.</p>'
                    .$this->figure($a(5), 'Where scholarship students live and study')
                    .'<h2>Step 6: write a study plan that stands out</h2><ul><li>Say exactly what you will study and why in China</li><li>Connect your past experience to your plan</li><li>Name the programme and what you will do after graduating</li><li>Keep it clear and honest; committees read many</li></ul>'
                    .'<h2>Avoid scholarship scams</h2><ul><li>Awards cannot be bought, and nobody can guarantee one</li><li>Never pay to &ldquo;reserve&rdquo; a place in a government scholarship</li><li>Check every notice on the official site of the awarding body</li></ul>'
                    .'<h2>If you are not selected</h2><p>Ask the university whether another scholarship or a partial reduction is available, apply to the next round, and strengthen your study plan. Many successful applicants applied more than once.</p>'
                    .'<h2>Where to go next</h2><p>Read the <a href="/site/news/csc-scholarship-guide-how-to-apply">CSC guide</a>, the <a href="/site/news/csc-scholarship-checklist-documents-and-timeline">CSC checklist</a> and <a href="/site/news/scholarships-to-study-in-china-every-route-explained">every scholarship route explained</a>. CAS also offers <a href="/site/services#scholarships">scholarship assistance</a>.</p>'
                    .$this->faq([
                        ['What is the best scholarship to study in China?', 'There is no single best. The best one is the one you are eligible for and can apply to well before its deadline.'],
                        ['Can an agent guarantee my scholarship?', 'No. Nobody can guarantee an award. An agent can help you choose, prepare and submit.'],
                        ['How early should I start?', 'About six months before the earliest deadline for your level.'],
                    ])
                    .self::CHECKED.self::CTA,
            ],

            // 7 ─ Every scholarship route
            [
                'slug' => 'scholarships-to-study-in-china-every-route-explained',
                'title' => 'Scholarships to Study in China: Every Route Explained',
                'excerpt' => 'Chinese Government (CSC), provincial and university scholarships compared: who offers them, who can apply and how to find the one that fits you.',
                'category' => 'Scholarships',
                'date' => '2026-11-11 09:00:00',
                'cover' => $this->cover($a(6)),
                'body' => '<p>Scholarships to study in China come from three main sources. Knowing the difference saves you from applying to the wrong one.</p>'
                    .$this->summary([
                        'Three routes: the Chinese Government Scholarship (CSC), provincial or city awards, and university awards.',
                        'CSC has two channels: Type A through your government or the embassy, and Type B directly to a university.',
                        'What an award covers differs: some are full, some partial.',
                    ])
                    .$this->figure($a(6), 'A campus where scholarship students study')
                    .'<h2>1. Chinese Government Scholarship (CSC)</h2><p>Run by the China Scholarship Council. There are two channels: <strong>Type A</strong>, where you apply through your own government or the Chinese embassy, and <strong>Type B</strong>, where you apply to a participating university. Read the full explanation in our <a href="/site/news/csc-scholarship-guide-how-to-apply">CSC scholarship guide</a> or on the <a href="/site/csc-scholarship">CSC page</a>.</p>'
                    .'<h2>2. Provincial and city government scholarships</h2><p>Many provinces and cities fund international students at universities in their region. Rules, amounts and deadlines are set locally, so read each notice.</p>'
                    .'<h2>3. University scholarships</h2><p>Universities offer their own awards, from full tuition waivers to partial reductions. These often have the clearest rules and can be easier to win. Each university page in our catalog lists the scholarships we have confirmed.</p>'
                    .'<h2>How the routes compare</h2><table><thead><tr><th>Route</th><th>Who awards it</th><th>Where you apply</th></tr></thead><tbody><tr><td>CSC Type A</td><td>Chinese government</td><td>Your government or the Chinese embassy</td></tr><tr><td>CSC Type B</td><td>Chinese government via universities</td><td>Directly to the university</td></tr><tr><td>Provincial or city</td><td>Local government</td><td>The university or the local notice</td></tr><tr><td>University</td><td>The university</td><td>The university</td></tr></tbody></table>'
                    .'<h2>What a scholarship may cover</h2><p>Depending on the award: tuition, accommodation, a monthly stipend and medical insurance. A partial award may cover only part of that. Always read what a specific award includes.</p>'
                    .$this->figure($a(7), 'Another campus with scholarship students')
                    .'<h2>Which route suits you?</h2><ul><li>Your government runs a CSC programme: consider Type A</li><li>You have a target university: consider Type B and its own awards</li><li>You are flexible about the city: look at provincial awards</li><li>You need a partial reduction: browse partial university awards</li></ul>'
                    .'<h2>Find scholarships in our catalog</h2><ul><li><a href="/site/scholarships?type=full">Full scholarships</a></li><li><a href="/site/scholarships?type=partial">Partial scholarships</a></li><li><a href="/site/scholarships">All scholarships</a></li></ul>'
                    .'<p>For the step-by-step process, read our <a href="/site/news/scholarship-guidance-how-to-choose-and-apply">scholarship guidance</a>.</p>'
                    .$this->faq([
                        ['Can I apply to more than one scholarship?', 'Yes, as long as each one allows it. Keep a list of every deadline.'],
                        ['Is a scholarship guaranteed if I meet the requirements?', 'No. Awards are competitive. Meeting the requirements lets you apply; a strong application is what wins.'],
                        ['Are there scholarships for a master\'s or PhD in China?', 'Yes. See our guides to a <a href="/site/news/masters-in-china-for-international-students">master&rsquo;s</a> and a <a href="/site/news/phd-in-china-for-international-students">PhD</a>.'],
                    ])
                    .self::CHECKED.self::CTA,
            ],

            // 8 ─ CSC checklist
            [
                'slug' => 'csc-scholarship-checklist-documents-and-timeline',
                'title' => 'CSC Scholarship Checklist: Documents and Timeline',
                'excerpt' => 'A practical checklist for CSC scholarships: the documents to prepare, a timeline to work backwards from the deadline, and the mistakes that cost applicants.',
                'category' => 'Scholarships',
                'date' => '2026-11-11 09:30:00',
                'cover' => $this->cover($a(8)),
                'body' => '<p>Strong CSC scholarship applications are rarely the work of the last week. This checklist turns the process into steps you can tick off. For the basics, start with our <a href="/site/news/csc-scholarship-guide-how-to-apply">CSC scholarship guide</a>.</p>'
                    .$this->summary([
                        'Start five to six months before the deadline.',
                        'Prepare documents in the order of how long they take.',
                        'Write one focused study plan per university.',
                        'Submit with time for corrections.',
                    ])
                    .$this->figure($a(8), 'Where CSC scholars study')
                    .'<h2>Documents checklist</h2><ul><li>Passport (valid for the whole intended stay)</li><li>Highest certificate and full transcripts, in English or Chinese or with a certified translation</li><li>Study plan or research proposal</li><li>Recommendation letters (master&rsquo;s and PhD)</li><li>Foreigner Physical Examination Record</li><li>Criminal record certificate</li><li>Language evidence if the programme requires it</li><li>Passport-style photograph</li></ul>'
                    .'<h2>A timeline to work backwards from the deadline</h2><ol><li><strong>Five to six months before:</strong> decide your channel (Type A or B), shortlist programmes and read the official notice.</li><li><strong>Four months before:</strong> ask referees; order certified copies and translations.</li><li><strong>Three months before:</strong> draft the study plan; start the medical examination.</li><li><strong>Two months before:</strong> finish documents, get feedback on your study plan.</li><li><strong>One month before:</strong> submit, with time for corrections.</li></ol>'
                    .'<h2>Type A and Type B: what changes</h2><ul><li><strong>Type A:</strong> you apply through your own government or the Chinese embassy; check their deadline and forms.</li><li><strong>Type B:</strong> you apply to the university, which nominates candidates; check the university&rsquo;s own scholarship page and deadline.</li></ul>'
                    .'<h2>Writing a study plan that gets read</h2><ul><li>One clear goal, stated in the first paragraph</li><li>The exact programme and why China</li><li>Concrete steps for each year of study</li><li>What you will do with the degree afterwards</li></ul>'
                    .$this->figure($a(9), 'A campus to apply to')
                    .'<h2>Recommendation letters</h2><p>Ask people who know your work well and give them your CV and study plan. Ask at least a month before they are needed.</p>'
                    .'<h2>Keep a tracker</h2><table><thead><tr><th>University</th><th>Channel</th><th>Deadline</th><th>Documents ready</th><th>Submitted</th></tr></thead><tbody><tr><td></td><td></td><td></td><td></td><td></td></tr></tbody></table>'
                    .'<h2>Common reasons applications fail</h2><ul><li>Incomplete or unclear documents</li><li>A generic study plan sent to many universities</li><li>Choosing a programme that does not accept scholarship students</li><li>Missing a deadline that is earlier than the admission deadline</li></ul>'
                    .'<h2>After you apply</h2><p>Keep your confirmation, answer any request from the university promptly, and keep preparing your visa documents. See the <a href="/site/news/china-x1-student-visa-guide">X1 visa guide</a>, and read the overview of <a href="/site/news/scholarships-to-study-in-china-every-route-explained">every scholarship route</a>.</p>'
                    .$this->faq([
                        ['How early should I start a CSC application?', 'About five to six months before the deadline, because certified documents and the medical examination take time.'],
                        ['Can I apply to several universities?', 'Where the notice allows it, yes. Tailor each study plan.'],
                    ])
                    .self::CHECKED.self::CTA,
            ],

            // 9 ─ Study in China complete guide
            [
                'slug' => 'study-in-china-complete-guide-for-international-students',
                'title' => 'Study in China: The Complete Guide for Students',
                'excerpt' => 'Everything to know before you study in China: levels and languages, intakes, costs, scholarships, the visa, cities and how to apply, in one place.',
                'category' => 'Study in China',
                'date' => '2026-11-12 09:00:00',
                'cover' => $this->cover($a(10)),
                'body' => '<p>China hosts international students from around the world, with thousands of programmes in English and Chinese. This guide gives you the full picture in one page, with links to the detail.</p>'
                    .$this->summary([
                        'You can study Chinese language, bachelor, master and PhD programmes.',
                        'English-taught programmes are easier to enter; Chinese-taught ones give more choice and scholarships.',
                        'Most universities start in September; some also in March.',
                        'After admission you apply for an X1 (long study) or X2 (short study) visa.',
                    ])
                    .$this->figure($a(10), 'A university in China')
                    .'<h2>Why study in China?</h2><ul><li>A wide range of universities, including those approved by the Ministry of Education for English-taught medicine</li><li>Programmes in English and in Chinese at every level</li><li>Scholarship routes for each level</li><li>Large, safe cities with international communities</li></ul>'
                    .'<h2>Levels you can study</h2><ul><li><strong>Chinese language and foundation courses</strong> for beginners</li><li><strong>Bachelor</strong> degrees, including <a href="/site/news/mbbs-in-china-2026-admission-guide">MBBS</a></li><li><strong>Master&rsquo;s</strong> programmes; see <a href="/site/news/masters-in-china-for-international-students">master&rsquo;s in China</a></li><li><strong>PhD</strong> programmes; see <a href="/site/news/phd-in-china-for-international-students">PhD in China</a></li></ul>'
                    .'<h2>English or Chinese?</h2><p>English-taught programmes are easier to enter but fewer. Chinese-taught programmes open more choice and scholarships and require HSK results. Many students take a Chinese foundation year first.</p>'
                    .'<h2>When to apply</h2><p>Most universities start in September, and some also in March. Application windows and scholarship deadlines differ, so check each programme page, which shows the windows we have confirmed. See <a href="/site/universities?topic=deadlines">universities with open admission windows</a>.</p>'
                    .$this->figure($a(11), 'Another campus in China')
                    .'<h2>What does it cost?</h2><p>Budget for tuition, accommodation, living costs and health insurance, plus visa and medical costs. Compare current figures on the <a href="/site/programs">programme pages</a>, and read our <a href="/site/news/study-in-china-admission-requirements-and-costs">requirements and costs guide</a>.</p>'
                    .'<h2>Scholarships</h2><p>Government, provincial and university scholarships exist; read <a href="/site/news/scholarships-to-study-in-china-every-route-explained">every route explained</a> and our <a href="/site/news/scholarship-guidance-how-to-choose-and-apply">scholarship guidance</a>.</p>'
                    .'<h2>The student visa</h2><p>After admission you apply for an X1 (long study) or X2 (short study) visa. Follow our <a href="/site/news/china-x1-student-visa-guide">X1 visa guide</a>.</p>'
                    .'<h2>Accommodation, insurance and daily life</h2><p>Universities offer on-campus accommodation, and many students also rent nearby. Health insurance is normally required for international students. Ask your university about both before you arrive.</p>'
                    .'<h2>Choosing a city</h2><p>Compare cost of living, climate and the number of international students. See <a href="/site/news/best-cities-to-study-in-china-for-international-students">the best cities to study in China</a>.</p>'
                    .'<h2>How to apply, in five steps</h2><ol><li>Choose your level and subject</li><li>Shortlist universities and programmes</li><li>Prepare documents and apply</li><li>Receive your offer and apply for the visa</li><li>Arrive and register</li></ol>'
                    .$this->faq([
                        ['Is China good for international students?', 'Many students choose it for its programmes, scholarships and cities. Whether it is right for you depends on your subject, budget and comfort with a new language and culture.'],
                        ['Can I study in China without speaking Chinese?', 'Yes, on English-taught programmes. Learning some Chinese still helps in daily life.'],
                        ['When is the best time to apply to study in China?', 'Start six to twelve months before your intake. September is the main start.'],
                        ['How do I choose a university in China?', 'Start with your subject and teaching language, then compare city, fees, scholarships and application windows.'],
                    ])
                    .self::CHECKED.self::CTA,
            ],

            // 10 ─ Study abroad in China
            [
                'slug' => 'study-abroad-in-china-is-it-right-for-you',
                'title' => 'Study Abroad in China: Is It Right for You?',
                'excerpt' => 'An honest look at studying abroad in China: what daily life is like, what to plan for, and a checklist to decide whether it fits your goals.',
                'category' => 'Study in China',
                'date' => '2026-11-12 09:30:00',
                'cover' => $this->cover($a(12)),
                'body' => '<p>Choosing where to study abroad is a big decision. China offers strong programmes and scholarships, but it is different from most other destinations. This page helps you decide with open eyes.</p>'
                    .$this->summary([
                        'China suits students who want a specific programme or scholarship and are open to a new language and culture.',
                        'Plan for language, local apps, climate and visa registration.',
                        'Use the checklist below to decide.',
                    ])
                    .$this->figure($a(12), 'International students study here')
                    .'<h2>What you gain</h2><ul><li>Programmes in many fields, with English-taught options</li><li>Scholarships for several levels</li><li>A chance to learn Chinese and work with a growing economy</li></ul>'
                    .'<h2>What to plan for</h2><ul><li><strong>Language:</strong> daily life is easier with some Chinese, even on an English-taught programme.</li><li><strong>Apps and websites:</strong> some foreign services are restricted, and everyday life runs on local apps for messaging and payments. Learn the main ones before you travel.</li><li><strong>Climate and food:</strong> northern and southern cities differ a lot.</li><li><strong>Visa and registration:</strong> you must convert your visa into a residence permit soon after arrival.</li><li><strong>Work:</strong> study visas do not normally allow employment, so plan your budget without it.</li></ul>'
                    .'<h2>Myths and reality</h2><ul><li><em>Myth:</em> you cannot study without Chinese. <em>Reality:</em> many programmes are in English, and Chinese helps your daily life.</li><li><em>Myth:</em> every degree is accepted everywhere. <em>Reality:</em> recognition depends on your country and profession; check it.</li><li><em>Myth:</em> scholarships are easy. <em>Reality:</em> they are competitive; prepare well.</li></ul>'
                    .$this->figure($a(13), 'Student life on a Chinese campus')
                    .'<h2>A checklist to decide</h2><ol><li>Is there a programme in my subject at the level I need?</li><li>Can I afford it, or can I win a scholarship?</li><li>Is the degree recognised where I want to work?</li><li>Am I willing to learn some Chinese?</li><li>Do I have time to prepare documents and the visa?</li></ol>'
                    .'<p>If most answers are yes, start with our <a href="/site/news/study-in-china-complete-guide-for-international-students">complete guide to studying in China</a>, then compare <a href="/site/programs">programmes</a>.</p>'
                    .$this->faq([
                        ['Is studying abroad in China safe?', 'Large Chinese cities are generally considered safe for students, and universities have international offices to help. Follow your university&rsquo;s guidance.'],
                        ['Is studying in China cheaper than other countries?', 'Tuition is often lower than in other major destinations, but costs differ by university and city. Compare current figures on each programme page.'],
                    ])
                    .self::CHECKED.self::CTA,
            ],

            // 11 ─ Best cities
            [
                'slug' => 'best-cities-to-study-in-china-for-international-students',
                'title' => 'Best Cities to Study in China for Internationals',
                'excerpt' => 'How to choose a city to study in China, and the cities with the most universities in the CAS catalog, with links to each city page.',
                'category' => 'Study in China',
                'date' => '2026-11-12 10:00:00',
                'cover' => $this->cover($cityPhotos->first()),
                'body' => '<p>Your city shapes your costs, your climate and your daily life as much as your university does. Use these questions to choose, then explore the cities below.</p>'
                    .$this->summary([
                        'Compare cost of living, climate, international community and your subject.',
                        'The cities below have the most universities in the CAS catalog.',
                    ])
                    .$this->figure($cityPhotos->first(), 'A city campus')
                    .'<h2>How to choose a city</h2><ul><li><strong>Cost of living:</strong> large coastal cities are usually more expensive than inland ones.</li><li><strong>Climate:</strong> the north has cold winters and the south is warmer and humid.</li><li><strong>International community:</strong> more international students usually means more English support and shops.</li><li><strong>Your programme:</strong> some fields, such as medicine, cluster in particular cities.</li></ul>'
                    .'<h2>Cities with the most universities in our catalog</h2><ul>'
                    .$cities->map(fn ($c) => '<li><a href="/site/cities/'.e(Str::slug($c->city)).'">'.e($c->city).'</a>: '.(int) $c->total.' universities</li>')->implode('')
                    .'</ul><p>See every city on the <a href="/site/cities">cities page</a>.</p>'
                    .$this->figure($cityPhotos->get(1), 'Another city to consider')
                    .'<h2>Types of city to consider</h2><ul><li><strong>Big metropolises:</strong> the most choice, the busiest and often the most expensive</li><li><strong>Coastal cities:</strong> mild or humid weather and strong international links</li><li><strong>Northern cities:</strong> cold winters, with heated buildings indoors</li><li><strong>Inland cities:</strong> often lower living costs</li></ul>'
                    .$this->figure($cityPhotos->get(2), 'A third option')
                    .'<h2>What to check about any city</h2><ol><li>Universities that teach your subject in your language</li><li>Accommodation options and approximate rents</li><li>Distance to an international airport</li><li>Winter heating, for northern cities</li></ol>'
                    .'<p>Next: <a href="/site/news/study-in-china-complete-guide-for-international-students">the complete guide to studying in China</a>.</p>'
                    .$this->faq([
                        ['Which is the cheapest city to study in China?', 'Costs vary by university and lifestyle. As a rule, inland cities cost less than large coastal ones. Compare programme pages and ask for a fee notice.'],
                        ['Which city is best for English-taught programmes?', 'Cities with many universities have more choice. Use the programme finder to filter by language.'],
                    ])
                    .self::CHECKED.self::CTA,
            ],
        ];
    }
}

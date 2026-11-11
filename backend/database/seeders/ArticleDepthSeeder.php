<?php

namespace Database\Seeders;

use App\Models\Intake;
use App\Models\Post;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

/**
 * Brings every published article above 1,000 words with real material: statistics computed from the
 * live catalog (fees, programmes, cities, scholarships, dates) plus explanatory sections that carry no
 * year-specific figure. Runs after GuidesSeeder, NewsSeeder and SeoArticlesSeeder.
 *
 * Idempotent: the extra sections carry a marker and are only added once per body.
 */
class ArticleDepthSeeder extends Seeder
{
    private const MARK = '<!--depth-->';

    public function run(): void
    {
        if (! Schema::hasTable('posts')) {
            return;
        }

        $this->deadlinesRoundup();

        $more = $this->moreExtras();
        $base = $this->extras();
        $base['china-university-application-deadlines-2027-intakes'] ??= '';

        foreach ($base as $slug => $html) {
            $html .= ($more[$slug] ?? '').($this->thirdExtras()[$slug] ?? '').($this->fourthExtras()[$slug] ?? '').($this->fifthExtras()[$slug] ?? '');
            $post = Post::where('slug', $slug)->first();
            if (! $post || str_contains($post->body, self::MARK)) {
                continue;
            }

            $body = $post->body;
            // Extras go before the FAQ when there is one, else before the closing note, else at the end.
            foreach (['<h2>Frequently asked questions</h2>', '<p><em>Checked against'] as $anchor) {
                if (str_contains($body, $anchor)) {
                    $body = preg_replace('/'.preg_quote($anchor, '/').'/', self::MARK.$html.$anchor, $body, 1);
                    break;
                }
            }
            if (! str_contains($body, self::MARK)) {
                $body .= self::MARK.$html;
            }

            $post->update(['body' => $body]);
        }

    }

    // ── data blocks (computed from the catalog) ─────────────────────────────

    private function cny(float $n): string
    {
        return 'CNY '.number_format($n);
    }

    /** Fee quartiles for English-taught programmes, per level, from programmes with a published fee. */
    private function feeTable(array $levels = ['bachelor', 'master', 'phd']): string
    {
        $rows = '';
        foreach ($levels as $level) {
            $v = Program::where('level', $level)->where('registry_only', false)->where('teaching_language', 'English')
                ->where('tuition_fee', '>', 0)->where('currency', 'CNY')->pluck('tuition_fee')->map(fn ($x) => (float) $x)->sort()->values();
            $n = $v->count();
            if ($n < 20) {
                continue;
            }
            $rows .= '<tr><td>'.ucfirst($level).'</td><td>'.number_format($n).'</td><td>'.$this->cny($v[intdiv($n, 4)]).'</td><td>'.$this->cny($v[intdiv($n, 2)]).'</td><td>'.$this->cny($v[intdiv($n * 3, 4)]).'</td></tr>';
        }

        return '<table><thead><tr><th>Level</th><th>Programmes with a listed fee</th><th>Lower quartile</th><th>Median</th><th>Upper quartile</th></tr></thead><tbody>'.$rows.'</tbody></table>'
            .'<p>Figures are tuition in Chinese yuan as published by each university and recorded in the CAS catalog for English-taught programmes. Check the unit and the year on each programme page, because universities update them every cycle.</p>';
    }

    /** The MoE-approved MBBS universities grouped by province. */
    private function mbbsByProvince(): string
    {
        $rows = University::where('moe_listed', true)->get(['province', 'city', 'name'])->groupBy(fn ($u) => $u->province ?: 'Not recorded')->sortKeys();
        $html = '';
        foreach ($rows as $province => $list) {
            $html .= '<tr><td>'.e($province).'</td><td>'.$list->count().'</td><td>'.e($list->pluck('city')->filter()->unique()->sort()->implode(', ')).'</td></tr>';
        }

        return '<table><thead><tr><th>Province or municipality</th><th>Approved universities</th><th>Cities</th></tr></thead><tbody>'.$html.'</tbody></table>';
    }

    /** Cities with the most universities teaching in English at one level. */
    private function cityTable(string $level, int $limit = 10): string
    {
        $rows = Program::where('level', $level)->where('registry_only', false)->where('teaching_language', 'English')
            ->join('universities', 'universities.id', '=', 'programs.university_id')
            ->where('universities.status', 'active')->whereNotNull('universities.city')
            ->selectRaw('universities.city as city, count(distinct universities.id) as unis, count(*) as progs')
            ->groupBy('universities.city')->orderByDesc('progs')->limit($limit)->get();
        $html = $rows->map(fn ($r) => '<tr><td>'.e($r->city).'</td><td>'.(int) $r->unis.'</td><td>'.number_format((int) $r->progs).'</td></tr>')->implode('');

        return '<table><thead><tr><th>City</th><th>Universities</th><th>English-taught '.$level.' programmes</th></tr></thead><tbody>'.$html.'</tbody></table>';
    }

    private function levelCounts(): array
    {
        $out = [];
        foreach (['bachelor', 'master', 'phd'] as $l) {
            $base = Program::where('level', $l)->where('registry_only', false)->where('teaching_language', 'English');
            $out[$l] = ['programs' => (clone $base)->count(), 'unis' => (clone $base)->distinct()->count('university_id')];
        }

        return $out;
    }

    private function levelCountsSentence(): string
    {
        $c = $this->levelCounts();

        return 'Today the CAS catalog records '.number_format($c['bachelor']['programs']).' English-taught bachelor programmes at '.number_format($c['bachelor']['unis']).' universities, '
            .number_format($c['master']['programs']).' English-taught master&rsquo;s programmes at '.number_format($c['master']['unis']).' universities, and '
            .number_format($c['phd']['programs']).' English-taught doctoral programmes at '.number_format($c['phd']['unis']).' universities.';
    }

    private function scholarshipMix(): string
    {
        $counts = Scholarship::where('status', '!=', 'archived')->selectRaw('type, count(*) c')->groupBy('type')->orderByDesc('c')->get();
        $total = $counts->sum('c');
        $html = $counts->map(fn ($r) => '<tr><td>'.e(ucfirst((string) $r->type)).'</td><td>'.(int) $r->c.'</td></tr>')->implode('');

        return '<p>The catalog currently records '.$total.' scholarships, grouped by type as follows.</p><table><thead><tr><th>Type</th><th>Scholarships recorded</th></tr></thead><tbody>'.$html.'</tbody></table>';
    }

    private function governmentScholarships(): string
    {
        $rows = Scholarship::where('scope', 'government')->orderBy('name')->get(['name', 'slug', 'coverage']);
        $html = $rows->map(fn ($s) => '<tr><td><a href="/site/scholarships?q='.urlencode((string) $s->name).'">'.e($s->name).'</a></td><td>'.e((string) $s->coverage).'</td></tr>')->implode('');

        return '<table><thead><tr><th>Government-level scholarship</th><th>Coverage as published</th></tr></thead><tbody>'.$html.'</tbody></table>';
    }

    private function deadlinesTable(int $limit = 14): string
    {
        $rows = Intake::with('university:id,name,slug')->whereNotNull('application_deadline')->where('application_deadline', '>=', '2026-11-12')
            ->orderBy('application_deadline')->get()->unique(fn ($i) => $i->university_id.$i->application_deadline)->take($limit);
        $html = $rows->map(fn ($i) => '<tr><td><a href="/site/universities/'.e((string) $i->university?->slug).'">'.e((string) $i->university?->name).'</a></td><td>'.e((string) $i->name).'</td><td>'.$i->application_deadline->format('j F Y').'</td></tr>')->implode('');

        return $rows->isEmpty() ? '' : '<table><thead><tr><th>University</th><th>Intake</th><th>Application deadline</th></tr></thead><tbody>'.$html.'</tbody></table>';
    }

    // ── notice roundup replaces four very short posts ───────────────────────

    private function deadlinesRoundup(): void
    {
        $slugs = [
            'zust-march-2027-chinese-language-intake-closes-10-january',
            'dalian-medical-university-spring-2027-applications-open',
            'nuist-september-2027-applications-close-30-april',
            'liaoning-petrochemical-university-spring-2027-applications',
        ];
        if (Post::whereIn('slug', $slugs)->doesntExist() && Post::where('slug', 'china-university-application-deadlines-2027-intakes')->doesntExist()) {
            return;
        }

        $body = '<p>Application windows decide whether a place is still open when you are ready to apply. This roundup collects the intake notices we have confirmed on official university pages for the 2027 cycle, explains how to read them, and shows the deadlines currently recorded in the CAS catalog.</p>'
            .'<h2>In short</h2><ul><li>Universities publish their own windows, so there is no single national deadline.</li><li>Spring (March) and autumn (September) are the usual starts; some universities take Chinese-language students in both.</li><li>Scholarship deadlines are frequently earlier than the general deadline.</li><li>An online system can close before the stated date once capacity is reached.</li></ul>'
            .'<h2>Notices confirmed for 2027</h2>'
            .'<h3>Dalian Medical University: spring 2027 intake</h3><p>The International Education College opened its online application system on 20 October 2026 for the March 2027 intake. The programmes listed are the Pre-medical Program and the undergraduate Clinical Medicine (MBBS) program. The notice gives no closing date. Applicants need high-school certificates and transcripts certified by the Chinese embassy or consulate (or notarized in China), a financial statement and a medical check-up. See the <a href="/site/universities/dalian-medical-university">university page</a>.</p>'
            .'<h3>Liaoning Petrochemical University: a published yearly schedule</h3><p>For the spring intake, applications open on 1 November and close on 20 April of the following year, with registration from 1 March to 20 May. For the autumn intake, applications open on 1 May and close on 20 October, with registration from 1 September to 20 November. Short courses can be applied for at any time. The university lists annual tuition of CNY 16,000 for English-taught bachelor programmes, CNY 14,500 for Chinese-taught bachelor programmes, CNY 19,000 for master&rsquo;s programmes and CNY 12,000 for Chinese language, plus a CNY 800 application fee. See the <a href="/site/universities/liaoning-petrochemical-university">university page</a>.</p>'
            .'<h3>NUIST: September 2027 intake</h3><p>Nanjing University of Information Science and Technology lists 30 April 2027 as the application deadline for university scholarships and self-sponsored programmes, and notes that the online system may close earlier once capacity is reached. The application fee is CNY 500, and annual tuition is CNY 15,000 for bachelor, CNY 20,000 for master&rsquo;s and CNY 25,000 for doctoral programmes. No opening date is given. See the <a href="/site/universities/nanjing-university-of-information-science-and-technology">university page</a>.</p>'
            .'<h3>ZUST: March 2027 Chinese-language programme</h3><p>Zhejiang University of Science and Technology is accepting applications for a non-degree Chinese-language programme for the spring semester, running 8 March to 25 June 2027 with 20 class hours a week. The deadline is 10 January 2027. Tuition is CNY 7,500 for the semester and the application fee is CNY 400. A double room in the international dormitory costs CNY 600 per bed per month, for at least one semester. See the <a href="/site/universities/zhejiang-university-of-science-and-technology">university page</a>.</p>'
            .'<h2>Upcoming deadlines recorded in the catalog</h2><p>Each row is an intake with an official application deadline that we have recorded and dated. Always confirm on the university&rsquo;s own page before you apply.</p>'.$this->deadlinesTable(14)
            .'<h2>How to read an intake notice</h2><p>Four dates matter, and many notices show only some of them. The <strong>opening date</strong> is when the online system accepts applications. The <strong>deadline</strong> is the last day it does. <strong>Registration</strong> is when you arrive on campus. A separate <strong>scholarship deadline</strong> often falls earlier. When a notice omits a date, as two of the notices above do, ask the international office in writing and keep the reply.</p>'
            .'<h2>What every applicant should prepare</h2><ul><li>A passport that stays valid for the whole study period</li><li>Highest certificate and transcripts, certified or notarized as the university requires</li><li>A financial statement or sponsor letter where requested</li><li>The foreigner medical examination record</li><li>A criminal record certificate for most degree programmes</li><li>Language evidence for the teaching language</li></ul>'
            .'<h2>Spring or autumn: which intake should you choose?</h2><p>Autumn (September) is the main start, so degree programmes offer the most places and the widest choice then. Spring (March) intakes exist at some universities, mostly for language, pre-medical and selected degree programmes. If you are not ready by the autumn deadline, a spring language or foundation course can be a sensible bridge, but check that it leads into your target degree without losing a year.</p>'
            .'<h2>Mistakes that cost students a place</h2><ul><li>Assuming last year&rsquo;s dates repeat</li><li>Applying on the final day when the system can close early</li><li>Ignoring the earlier scholarship deadline</li><li>Sending documents that are not certified as required</li><li>Paying a fee to a third party that the university never asked for</li></ul>'
            .'<h2>Where to go next</h2><p>Compare <a href="/site/programs">programmes</a> and <a href="/site/universities">universities</a>, read the <a href="/site/news/study-in-china-complete-guide-for-international-students">complete guide to studying in China</a>, and check the <a href="/site/news/china-x1-student-visa-guide">X1 visa guide</a> once you hold an admission notice.</p>'
            .'<p><em>Checked against official university pages in November 2026. Dates change from year to year, so confirm them for your intake with the university.</em></p>'
            .'<h2>Need help choosing?</h2><p>CAS is an authorized agent that places international students into Chinese universities. <a href="/site/study-plan">Get a free study plan</a> or <a href="/site/contact">talk to a counselor</a>.</p>';

        Post::updateOrCreate(['slug' => 'china-university-application-deadlines-2027-intakes'], [
            'type' => 'news',
            'title' => 'China University Application Deadlines: 2027 Intakes',
            'excerpt' => 'Confirmed 2027 intake notices from Chinese universities, the deadlines recorded in our catalog, and how to read an admission schedule.',
            'body' => $body,
            'category' => 'Admissions',
            'cover_image_path' => '/images/hero-great-wall.webp',
            'status' => 'published',
            'published_at' => '2026-11-12 11:00:00',
        ]);

        Post::whereIn('slug', $slugs)->update(['status' => 'draft']);
    }

    // ── per-article sections ────────────────────────────────────────────────

    /** @return array<string, string> */
    private function extras(): array
    {
        $levels = $this->levelCountsSentence();
        $fees = $this->feeTable();
        $mix = $this->scholarshipMix();
        $gov = $this->governmentScholarships();

        return [
            'moe-approves-43-universities-english-mbbs-2026-27' => '<h2>Why the Ministry list matters</h2><p>China regulates English-taught medical education for international students more tightly than most other subjects. Instead of leaving each university to decide, the Ministry of Education publishes an annual list of the institutions that may recruit international undergraduate Clinical Medicine students in English. The rule protects students: a university outside the list may not enrol English-taught MBBS students, so an offer from one deserves caution.</p>'
                .'<h2>Where the approved universities are</h2><p>The approved universities are spread across the country. This table groups them by province or municipality, computed from the catalog so it always matches the badge shown on each university page.</p>'.$this->mbbsByProvince()
                .'<h2>How to use the list when you choose</h2><ol><li><strong>Start with the list, not the price.</strong> Remove every university that is not on it, whatever it promises.</li><li><strong>Check your own regulator.</strong> Whether the degree lets you practise at home depends on your national medical authority, not on China.</li><li><strong>Compare teaching hospitals.</strong> Ask where you will train, how far from campus, and how patient contact is handled in Chinese.</li><li><strong>Ask for a written fee notice</strong> covering all years, accommodation and insurance.</li><li><strong>Confirm the intake and deadline</strong> on the university&rsquo;s own admission page.</li></ol>'
                .'<h2>What the list does not tell you</h2><p>Being on the list means a university may recruit; it does not rank quality, guarantee recognition abroad or promise a scholarship. Two approved universities can differ widely in class size, hospital access and support for international students. Treat the list as the entry filter and the comparison as your own work.</p>'
                .'<h2>Read next</h2><ul><li><a href="/site/news/mbbs-in-china-2026-admission-guide">MBBS in China 2026: admission guide</a></li><li><a href="/site/news/mbbs-in-china-2027-how-to-prepare-and-apply">MBBS in China 2027: how to prepare and apply</a></li><li><a href="/site/news/study-medicine-in-china-mbbs-bds-tcm">Study medicine in China: MBBS, BDS, TCM and more</a></li><li><a href="/site/mbbs-in-china">MBBS in China: approved universities and programmes</a></li></ul>'
                .'<h2>Frequently asked questions</h2><h3>Does the list change every year?</h3><p>Yes. The Ministry publishes it for each academic year, so confirm it again for the year you enrol.</p><h3>Can a university recruit MBBS students in Chinese without being on the list?</h3><p>The list governs English-taught programmes for international students. Rules for Chinese-taught programmes differ, so ask the university and read its notice.</p><h3>Where can I see which universities are approved?</h3><p>On this site, approved universities carry the &ldquo;MoE-approved MBBS&rdquo; badge and you can filter the university list to show only them.</p>',

            'mbbs-in-china-guide-international-students' => '<h2>MBBS in China by the numbers</h2><p>'.$levels.' Medicine is the most regulated part of that catalog: only the approved universities may recruit English-taught Clinical Medicine students, and the programme runs for 72 months at every approved university we list.</p>'
                .'<h2>Where the approved universities are</h2>'.$this->mbbsByProvince()
                .'<h2>What six years look like</h2><p>The first stage is mostly basic sciences: anatomy, physiology, biochemistry and related subjects, taught in lectures and laboratories. The middle years introduce pathology, pharmacology and clinical skills. The final stage moves into teaching hospitals and ends with an internship. Chinese-language classes usually run alongside because patients speak Chinese; ask each university how many hours you will receive and whether clinical teachers use English.</p>'
                .'<h2>Questions to put to every university</h2><ul><li>Which hospitals will I train in, and how far are they from campus?</li><li>How many students are in each class and clinical group?</li><li>What does the fee notice include for each of the six years?</li><li>How much Chinese is taught, and is it assessed?</li><li>What help do international students get with the residence permit and insurance?</li></ul>'
                .'<h2>Recognition at home</h2><p>Chinese approval lets you study; your national regulator decides whether you can practise. Some regulators require a screening exam for graduates of foreign universities, and some ask for a pre-entry test before you begin. Read the current notice from your own regulator before you pay any fee, and keep a copy.</p>'
                .'<h2>Next steps</h2><p>Read the <a href="/site/news/mbbs-in-china-2026-admission-guide">2026 admission guide</a>, plan ahead with the <a href="/site/news/mbbs-in-china-2027-how-to-prepare-and-apply">2027 guide</a>, and compare <a href="/site/mbbs-in-china">approved universities</a>.</p>',

            'csc-scholarship-guide-how-to-apply' => '<h2>The government-level scholarships in our catalog</h2><p>CSC is the best known of several scholarships funded at national or city level. These are the ones currently recorded in the catalog, with the coverage each one publishes.</p>'.$gov
                .'<h2>Two ways into the Chinese Government Scholarship</h2><p>Applicants reach the programme through one of two channels. In the first, you apply through your own government or the Chinese embassy in your country, within a national quota. In the second, you apply to a participating Chinese university, which nominates candidates to the China Scholarship Council. The notice for your channel sets the forms, dates and documents, and the two channels do not always share a deadline.</p>'
                .'<h2>What a strong application contains</h2><ul><li><strong>A focused study plan:</strong> one clear goal, the exact programme and why it fits you.</li><li><strong>Strong referees:</strong> teachers who know your work, given your CV and plan at least a month ahead.</li><li><strong>Complete, certified documents:</strong> transcripts, certificates, medical record, criminal record certificate and passport.</li><li><strong>A realistic list of universities:</strong> programmes that accept scholarship students and match your level.</li></ul>'
                .'<h2>Typical timeline</h2><ol><li>Five to six months before the deadline: choose your channel and read the official notice.</li><li>Four months before: ask referees and order certified copies.</li><li>Three months before: draft your study plan and book the medical examination.</li><li>Two months before: finish documents and get feedback.</li><li>One month before: submit with time for corrections.</li></ol>'
                .'<h2>Other scholarships to apply for alongside</h2>'.$mix
                .'<h2>Avoid scholarship scams</h2><p>Awards cannot be bought and nobody can guarantee one. Check every notice on the official site of the awarding body, and never pay anyone to &ldquo;reserve&rdquo; a government scholarship place.</p>'
                .'<h2>Read next</h2><ul><li><a href="/site/news/csc-scholarship-checklist-documents-and-timeline">CSC scholarship checklist: documents and timeline</a></li><li><a href="/site/news/scholarships-to-study-in-china-every-route-explained">Scholarships to study in China: every route explained</a></li><li><a href="/site/news/scholarship-guidance-how-to-choose-and-apply">Scholarship guidance: how to choose and apply</a></li></ul>',

            'china-x1-student-visa-guide' => '<h2>X1 and X2: which one do you need?</h2><p>China issues two main student visas. The X1 is for study longer than 180 days and is converted into a residence permit after arrival. The X2 is for study of 180 days or less and does not convert into a residence permit. A full degree needs an X1; a short course may need only an X2.</p>'
                .'<h2>Step by step</h2><ol><li><strong>Receive your admission notice and the visa application form</strong> (JW201 or JW202) from the university. Check that your name matches your passport exactly.</li><li><strong>Prepare your documents:</strong> passport, the admission notice, the visa application form, a completed online application, passport photographs and the foreigner physical examination record where required.</li><li><strong>Book an appointment</strong> at the Chinese embassy, consulate or visa application service centre that serves your place of residence.</li><li><strong>Attend, give biometrics where required and pay the fee.</strong></li><li><strong>Collect your passport and check the visa</strong>, including your name, the entry limit and the validity.</li><li><strong>Travel and register:</strong> within 30 days of arrival, convert the X1 into a residence permit through your university.</li></ol>'
                .'<h2>Documents checklist</h2><ul><li>Passport valid for the whole study period and with blank pages</li><li>Original admission notice</li><li>Original JW201 or JW202</li><li>Completed online visa application form</li><li>Recent passport-style photograph</li><li>Physical examination record, when the centre asks for it</li><li>Any extra items the specific embassy lists</li></ul>'
                .'<h2>After you arrive</h2><p>Register with the university on the days it sets, complete the residence permit application with the international office, and keep your passport and permit safe. Do not let the X1 entry window lapse: the 30 days run from the day you enter China.</p>'
                .'<h2>Common problems</h2><ul><li><strong>Name mismatch:</strong> an admission notice that differs from the passport delays the visa.</li><li><strong>Late medical examination:</strong> start early, because some results take time.</li><li><strong>Wrong visa type:</strong> a tourist visa cannot be converted into a study permit.</li><li><strong>Booking too late:</strong> appointments can be limited close to the start of the term.</li></ul>'
                .'<h2>Rules vary by embassy</h2><p>Embassies and visa centres set their own appointment and document rules, and these change. Use this page as a checklist and confirm the current requirements with the one that serves you.</p>'
                .'<h2>Before the visa</h2><p>The visa follows admission. Read the <a href="/site/news/study-in-china-complete-guide-for-international-students">complete guide to studying in China</a> and our <a href="/site/news/study-in-china-admission-requirements-and-costs">requirements and costs guide</a>.</p>',

            'study-in-china-admission-requirements-and-costs' => '<h2>What English-taught tuition looks like in our catalog</h2><p>'.$levels.' This table summarises the tuition universities publish for those programmes.</p>'.$fees
                .'<h2>Costs beyond tuition</h2><ul><li><strong>Accommodation:</strong> many universities list dormitory prices separately; ask whether the price is per bed or per room and per month or per year.</li><li><strong>Insurance:</strong> international students are normally required to hold health insurance.</li><li><strong>Living costs:</strong> food, transport and phone vary by city.</li><li><strong>Visa and medical examination:</strong> one-off costs before you travel.</li><li><strong>Application fee:</strong> charged by some universities; confirm it on the official page.</li></ul>'
                .'<h2>Requirements by level</h2><h3>Bachelor</h3><p>High-school completion with a transcript, a valid passport, a medical examination and language evidence for the teaching language. Some programmes set an age limit and a minimum grade.</p><h3>Master&rsquo;s</h3><p>A bachelor degree in a related field, transcripts, a study plan, two recommendation letters and language evidence.</p><h3>PhD</h3><p>A master degree, a research proposal, a CV, recommendation letters and often a supervisor who agrees to take you.</p>'
                .'<h2>How to pay less</h2><p>Scholarships are the main route to lower costs. '.'The catalog records scholarships at national, provincial, municipal and university level; see <a href="/site/scholarships">all scholarships</a> and read our <a href="/site/news/scholarship-guidance-how-to-choose-and-apply">scholarship guidance</a>.</p>'
                .'<h2>Build your own budget</h2><ol><li>Take the tuition from the programme page.</li><li>Add the dormitory price from the university.</li><li>Add insurance and a monthly living allowance for your city.</li><li>Add one-off visa, medical and travel costs.</li><li>Subtract any scholarship you have already confirmed.</li></ol>'
                .'<h2>Next</h2><p>Compare <a href="/site/programs">programmes</a>, then read how to apply in the <a href="/site/news/study-in-china-complete-guide-for-international-students">complete guide</a>.</p>',

            // ---- the 11 SEO articles ----
            'mbbs-in-china-2027-how-to-prepare-and-apply' => '<h2>Choosing where to apply: data from the catalog</h2><p>The approved universities in the catalog are spread across many provinces. Use this table to see how your options are distributed.</p>'.$this->mbbsByProvince()
                .'<h2>How to compare two approved universities</h2><p>Write the same six answers for each shortlisted university: the teaching hospitals, the class size, the fee notice, the amount of Chinese taught, the accommodation, and the application window. A university that cannot give you written answers to these questions is a poor sign, however well it presents itself.</p>'
                .'<h2>Questions to ask your national regulator</h2><ul><li>Do graduates of foreign medical schools need a screening or licensing exam?</li><li>Is there an entrance test before I may study medicine abroad?</li><li>Does the regulator keep a list of recognised foreign universities?</li><li>Is there a required internship location or length?</li></ul>'
                .'<h2>A realistic checklist for the last three months</h2><ol><li>Hold your admission notice and the visa application form.</li><li>Pay only the fees that the university&rsquo;s notice states, to the account it states.</li><li>Book the visa appointment as soon as the notice arrives.</li><li>Arrange health insurance and accommodation.</li><li>Plan your first week: arrival, registration, the residence permit.</li></ol>',

            'study-medicine-in-china-mbbs-bds-tcm' => '<h2>MBBS: the approved universities by province</h2>'.$this->mbbsByProvince()
                .'<h2>How the catalog describes the medical offer</h2><p>'.$this->levelCountsSentence().' Only a small part of that is medicine, and undergraduate Clinical Medicine in English sits behind the Ministry list. Programmes in dentistry, nursing, pharmacy, public health and traditional Chinese medicine are listed separately and follow their own rules.</p>'
                .'<h2>Choosing between a clinical degree and a related health degree</h2><ul><li>If you want to become a medical doctor, only Clinical Medicine leads there.</li><li>If you want dentistry, look for Stomatology and check dental regulator rules.</li><li>If you prefer research, a master&rsquo;s or PhD in a biomedical field may suit you better.</li><li>If you want nursing or pharmacy, check the council that licenses the profession in your country.</li></ul>'
                .'<h2>What to look for in the first year</h2><p>Expect a heavy basic-science load and a new language. Students who plan Chinese classes early and form study groups usually settle faster. Ask the university about tutoring, mentoring and how it supports students who fall behind.</p>',

            'masters-in-china-for-international-students' => '<h2>Master&rsquo;s tuition in our catalog</h2><p>'.$this->levelCountsSentence().'</p>'.$this->feeTable(['master'])
                .'<h2>Cities with the most English-taught master&rsquo;s programmes</h2>'.$this->cityTable('master')
                .'<h2>Choosing a supervisor and a lab</h2><p>For a research master&rsquo;s, your supervisor shapes your whole degree. Read two or three of the professor&rsquo;s recent papers, ask the department how many master&rsquo;s students they supervise, and ask current students about meeting frequency and funding for research costs.</p>'
                .'<h2>Writing a study plan that fits</h2><ul><li>State your research interest in the first paragraph.</li><li>Link it to a course or lab at that university.</li><li>Show the skills you already have.</li><li>Say what you will do after the degree.</li></ul>',

            'phd-in-china-for-international-students' => '<h2>PhD tuition in our catalog</h2>'.$this->feeTable(['phd'])
                .'<h2>Cities with the most English-taught doctoral programmes</h2>'.$this->cityTable('phd')
                .'<h2>What a good research proposal answers</h2><ol><li>What is the question, and why does it matter?</li><li>What has already been done, and what is missing?</li><li>How will you answer it: methods, data, equipment?</li><li>What will you deliver in each year?</li><li>Why this supervisor and this university?</li></ol>'
                .'<h2>Questions to ask a future supervisor</h2><ul><li>How many doctoral students do you supervise now?</li><li>How often do we meet?</li><li>Is there funding for conferences and fieldwork?</li><li>What are the publication expectations for graduation?</li><li>Where have your earlier students gone?</li></ul>'
                .'<h2>Funding and visas</h2><p>Scholarship deadlines are often earlier than admission deadlines, so apply for funding and the place in parallel. Once admitted you apply for the X1 visa; see the <a href="/site/news/china-x1-student-visa-guide">X1 visa guide</a>.</p>',

            'scholarship-guidance-how-to-choose-and-apply' => '<h2>The scholarship landscape in our catalog</h2>'.$mix
                .'<h2>Government-level scholarships</h2>'.$gov
                .'<h2>A worked example of choosing</h2><p>Imagine a student with a bachelor degree who wants an English-taught master&rsquo;s. They list the national channel first, then the provincial and municipal awards for the cities they like, then the awards of the universities on their shortlist. They sort them by deadline, discard any they do not qualify for, and write one tailored study plan per application. That order produces a short, realistic list instead of a long, hopeful one.</p>'
                .'<h2>Documents almost every scholarship asks for</h2><ul><li>Passport and recent photograph</li><li>Highest degree certificate and transcripts</li><li>Study plan or research proposal</li><li>Recommendation letters</li><li>Medical examination record</li><li>Language evidence</li></ul>',

            'scholarships-to-study-in-china-every-route-explained' => '<h2>What the catalog shows</h2>'.$mix
                .'<h2>The government-level awards</h2>'.$gov
                .'<h2>How to decide where to start</h2><p>Begin with the award for which you are certainly eligible, then widen. Many students stop at one famous scholarship, while provincial, municipal and university awards are far more numerous and are often less competitive for the applicant who prepares well.</p>'
                .'<h2>Reading what an award actually covers</h2><p>Copy the coverage into four lines: tuition, accommodation, living stipend and insurance, and mark each as covered, partly covered or not covered. A scholarship that covers tuition only is still valuable, but you need a plan for the rest.</p>',

            'csc-scholarship-checklist-documents-and-timeline' => '<h2>The government-level scholarships recorded in the catalog</h2>'.$gov
                .'<h2>A tracker you can copy</h2><p>For each application, record the university, the channel, the deadline, each document and its status, and who is writing each recommendation. Update it weekly. Students who keep one tracker rarely miss a requirement.</p>'
                .'<h2>The week before you submit</h2><ol><li>Reread the official notice from start to finish.</li><li>Check that every certificate and translation matches your passport spelling.</li><li>Ask one person who has not read your plan to read it.</li><li>Save a copy of everything you submit.</li><li>Submit at least a few days early.</li></ol>',

            'study-in-china-complete-guide-for-international-students' => '<h2>China at a glance in our catalog</h2><p>'.$this->levelCountsSentence().'</p>'
                .'<h2>Tuition levels</h2>'.$fees
                .'<h2>Cities with the most English-taught bachelor programmes</h2>'.$this->cityTable('bachelor')
                .'<h2>Scholarships</h2>'.$mix
                .'<h2>A simple plan for the next twelve months</h2><ol><li>Months 12 to 9: choose level and subject, read the recognition rules for your profession.</li><li>Months 9 to 6: shortlist universities, collect documents, check scholarship deadlines.</li><li>Months 6 to 3: apply, and chase the university for the admission notice.</li><li>Months 3 to 0: visa, insurance, accommodation, travel.</li></ol>',

            'study-abroad-in-china-is-it-right-for-you' => '<h2>What the numbers say</h2><p>'.$this->levelCountsSentence().' Choice is rarely the limit. The real questions are fit and preparation.</p>'
                .'<h2>Costs in perspective</h2>'.$fees
                .'<h2>Questions to ask yourself honestly</h2><ul><li>Am I comfortable being far from home for several years?</li><li>Can I manage in a new language for daily tasks?</li><li>Do I have a backup plan if my first choice of university says no?</li><li>Have I spoken to someone who studied in China?</li></ul>'
                .'<h2>How to test your decision</h2><p>Talk to current international students, read the university&rsquo;s international-student handbook, and ask a counselor to walk through a budget with you. If the numbers and the answers above still point to China, move on to a shortlist.</p>',

            'best-cities-to-study-in-china-for-international-students' => '<h2>Cities with the most English-taught master&rsquo;s programmes</h2>'.$this->cityTable('master')
                .'<h2>Cities with the most English-taught bachelor programmes</h2>'.$this->cityTable('bachelor')
                .'<h2>A simple way to choose</h2><p>Pick two or three cities that teach your subject in English, then compare them on four things: the fee notice, the dormitory price, the winter climate and the distance to an international airport. Write the answers side by side and the choice usually becomes clear.</p>'
                .'<h2>MBBS students: approved universities by province</h2>'.$this->mbbsByProvince(),
        ];
    }

    /**
     * A second layer of explanatory sections, unique to each article.
     *
     * @return array<string, string>
     */
    private function moreExtras(): array
    {
        return [
            'moe-approves-43-universities-english-mbbs-2026-27' => '<h2>Why English-taught MBBS is regulated</h2><p>English-taught medicine for foreign students grew quickly across many institutions, and quality, hospital access and class size varied widely. A national list gives students and families one authoritative place to check a university before paying anything. It also lets universities that meet the standard recruit with confidence.</p>'
                .'<h2>A due-diligence checklist for families</h2><ul><li>Find the university on the Ministry list for the academic year you plan to start.</li><li>Match the programme name: it should read Clinical Medicine (MBBS) and run as an undergraduate degree.</li><li>Ask the university for the admission notice and the JW201 or JW202 form only after you have accepted its written fee notice.</li><li>Pay only to the university&rsquo;s official account, never to a personal account.</li><li>Keep every message and receipt in one folder.</li></ul>'
                .'<h2>What an agent should and should not do</h2><p>A good agent explains the list, helps you prepare documents and submits your application. A good agent does not promise admission, invent a fee, or ask you to transfer money before you hold an official notice. CAS is an authorized agent: compare any agent against that standard.</p>',

            'mbbs-in-china-guide-international-students' => '<h2>Who this route suits</h2><p>MBBS in China suits students who have decided to become doctors, have strong biology and chemistry results, can study for six years abroad, and have checked that their own regulator accepts the qualification. It suits them less if the aim is simply to live in China or to find the cheapest degree.</p>'
                .'<h2>What students often misunderstand</h2><ul><li><strong>&ldquo;English-taught&rdquo; is not &ldquo;English-only&rdquo;.</strong> Patients speak Chinese, so Chinese helps in the clinical years.</li><li><strong>The Ministry list is an entry filter.</strong> It does not rank universities.</li><li><strong>Fees differ by university and year.</strong> One advertised figure rarely covers six years.</li></ul>'
                .'<h2>Before you pay anything</h2><p>Hold three documents: the regulator rule for your country, the university&rsquo;s written fee notice, and the official admission notice. If any one is missing, you are not ready to pay.</p>',

            'csc-scholarship-guide-how-to-apply' => '<h2>Who is likely to be competitive</h2><p>Selection committees read many applications with similar grades. What separates them is clarity: a study plan that names a programme, a reason to study it in China and a credible plan for afterwards, plus strong references and a complete file. Applicants with a clear research or career direction usually do better than those who list many general ambitions.</p>'
                .'<h2>How to use your university shortlist</h2><p>For the university channel, apply to universities that accept scholarship students for your level and subject. Read each university&rsquo;s own scholarship page for the nomination rules and dates, and tailor your plan to each programme rather than reusing one text everywhere.</p>'
                .'<h2>If you are not selected</h2><p>Ask for feedback where the office offers it, apply to provincial, municipal and university scholarships, and try again in the next round with a stronger study plan. Many awarded students applied more than once.</p>',

            'china-x1-student-visa-guide' => '<h2>Planning the timeline backwards</h2><p>Start from your registration date. Allow time to travel, then time for the visa, then time for the medical examination, then time for the admission notice. A student who works backwards from the start of term rarely has a last-minute problem; a student who waits for the notice before planning often does.</p>'
                .'<h2>Practical tips from our counselors</h2><ul><li>Photograph every page of your passport and notice before posting them anywhere.</li><li>Check the validity dates on the medical record, because some are valid for a limited period.</li><li>Do not buy a non-refundable ticket until the visa is in your passport.</li><li>Keep digital copies of the admission notice and the JW form.</li><li>Tell the university when you plan to arrive, so the international office can meet you.</li></ul>'
                .'<h2>The first week in China</h2><p>On arrival, report to the international office, complete registration and hand over your documents for the residence permit. Ask where to register your address with the local police if the university does not do it for you, and keep the receipts you are given.</p>',

            'study-in-china-admission-requirements-and-costs' => '<h2>How admission decisions are made</h2><p>Most universities review applications in order of completeness and academic fit. An application that arrives with certified documents, a clear study plan and the correct fee is reviewed faster than one that needs follow-up. For scholarship applications, a committee scores a set of criteria, so the details of your study plan and references carry more weight.</p>'
                .'<h2>Language requirements in plain terms</h2><p>For English-taught programmes, universities ask for evidence such as a recognised English test or a previous degree taught in English. For Chinese-taught programmes they usually ask for HSK results at a stated level. Programme pages state the requirement; if one does not, ask the university in writing.</p>'
                .'<h2>Document certification</h2><p>Some universities require certificates to be certified by the Chinese embassy or consulate, or notarized in China, as Dalian Medical University&rsquo;s notice does. Allow extra weeks for this step; it is a common cause of late applications.</p>'
                .'<h2>Common budget mistakes</h2><ul><li>Forgetting that dormitory and tuition are quoted separately</li><li>Assuming fees stay the same for every year</li><li>Ignoring the first-month costs: deposits, bedding, a phone plan and transport</li><li>Not keeping a reserve for medical costs the insurance does not cover</li></ul>'
                .'<h2>A final check before you apply</h2><p>Read the programme page, the university&rsquo;s admission notice and any scholarship notice together, and list every date and document they mention. If two sources disagree, write to the international office and keep the reply.</p>',

            'mbbs-in-china-2027-how-to-prepare-and-apply' => '<h2>Keep a single file of everything</h2><p>Create one folder, digital and paper, for every document, message and receipt. When an international office asks you for a copy of something you sent months ago, you will have it in seconds.</p>',

            'study-medicine-in-china-mbbs-bds-tcm' => '<h2>Careers and pathways after graduation</h2><p>After graduating, medical students may return home to take any licensing or screening exam their regulator requires, continue to a master&rsquo;s or PhD, or work in research. Dentistry, nursing and pharmacy graduates follow similar patterns with their own councils. Decide your target country early so that every choice, from the university to the internship, leaves that path open.</p>'
                .'<h2>Speak to people who did it</h2><p>Ask your counselor to connect you with recent graduates from the universities you are considering, and ask them the practical questions: class size, hospital access, language support and the licensing experience at home.</p>'
                .'<h2>How to read a programme page</h2><p>Check the full programme name, the level, the duration, the teaching language and the fee unit. If a page shows a duration or a fee that you cannot match to the university&rsquo;s own site, treat it as unconfirmed and ask.</p>',

            'masters-in-china-for-international-students' => '<h2>Common mistakes in master&rsquo;s applications</h2><ul><li>Sending one generic study plan to every university</li><li>Applying to a Chinese-taught programme without the required HSK result</li><li>Ignoring the earlier scholarship deadline</li><li>Choosing a programme by city alone</li></ul>'
                .'<h2>Before you accept an offer</h2><p>Confirm the programme name, the duration, the supervisor if there is one, the fee for each year and the scholarship terms in writing, and make sure that they match what the university published.</p>',

            'phd-in-china-for-international-students' => '<h2>Common mistakes in doctoral applications</h2><ul><li>Mass emails to dozens of professors with no personal detail</li><li>A proposal that repeats a master&rsquo;s thesis with no new question</li><li>Weak references from people who barely know your work</li><li>Applying without checking that the lab accepts international students</li></ul>'
                .'<h2>Timeline from first email to visa</h2><ol><li>Nine to twelve months before: shortlist professors and send first emails.</li><li>Six to nine months before: refine the proposal with a supervisor&rsquo;s feedback.</li><li>Four to six months before: submit the university and scholarship applications.</li><li>Two to four months before: receive the admission notice and apply for the visa.</li></ol>',

            'scholarship-guidance-how-to-choose-and-apply' => '<h2>How to compare two scholarships side by side</h2><p>Make a table with one column per scholarship and these rows: who awards it, what it covers, eligibility, deadline, where to apply and documents. When one scholarship needs documents you cannot get in time, you will see it at once and can move on to a better option.</p>'
                .'<h2>Talking to the university</h2><p>Write to the international office with a short, specific question: which scholarships are open for my programme, and which one would you recommend for my profile? Offices answer concrete questions quickly and often point to awards that do not appear on general lists.</p>',

            'scholarships-to-study-in-china-every-route-explained' => '<h2>Questions to ask before you apply to any scholarship</h2><ul><li>Is the award renewed every year, and on what condition?</li><li>Does it cover the whole programme or only the first year?</li><li>Do I have to apply to the university first?</li><li>What happens if I change programme?</li><li>Is there a minimum grade or a service requirement?</li></ul>'
                .'<h2>Combining a scholarship with your own funds</h2><p>Many students combine a partial award with family funds or a sponsor. Write down what the award covers and what remains, then plan the remainder with the same care as the application.</p>'
                .'<h2>Keeping track of several applications</h2><p>List every scholarship you apply to with its deadline, channel and documents, and tick each item off as you finish it. Students who track applications in one place avoid the most common failure: a deadline that passed unnoticed.</p>',

            'csc-scholarship-checklist-documents-and-timeline' => '<h2>Why applications are returned</h2><p>The common causes are practical: a missing page, a transcript without the required stamp, a study plan over the stated length, or a reference that arrived late. All of them are avoidable with the tracker and the final check described above.</p>'
                .'<h2>What to do if a document is delayed</h2><p>Tell the university early, send the document you have, and ask whether a certified copy can follow. Do not wait until the deadline to raise a problem.</p>'
                .'<h2>After you submit</h2><p>Keep the confirmation, check your email, including the spam folder, and answer any request quickly. While you wait, prepare the documents you will need for the visa, so you are ready if you are selected.</p>',

            'study-in-china-complete-guide-for-international-students' => '<h2>Common questions from families</h2><ul><li><strong>Is it safe?</strong> Universities have international offices and campus security, and students follow local advice.</li><li><strong>Can I work while I study?</strong> Study visas do not normally allow employment, so plan your budget without it.</li><li><strong>Will my degree be recognised?</strong> That depends on your country and profession; check with the authority that licenses it.</li><li><strong>Can my family visit?</strong> Visitors need their own visas.</li></ul>'
                .'<h2>First weeks in China</h2><p>Expect orientation, registration, the residence permit, a local phone plan and a bank or payment app. International offices usually run orientation for new students; attend it, because it explains the practical steps that save time later.</p>',

            'study-abroad-in-china-is-it-right-for-you' => '<h2>Culture and daily life</h2><p>Daily life in China runs on local apps for messaging, payments and transport, and learning them in your first week makes everything easier. Food varies a great deal by region, and universities usually have canteens with a wide range of prices. Public transport in big cities is extensive and inexpensive compared with many other countries.</p>'
                .'<h2>Health and wellbeing</h2><p>Register with the university clinic, understand what your insurance covers, and tell the international office if you have a continuing condition. Most universities run counselling and orientation services for international students; use them early rather than late.</p>'
                .'<h2>Staying connected to home</h2><p>Check which messaging and video services work in China before you travel, and set up the ones you need, so your family can reach you from the first day.</p>'
                .'<h2>If it is not right for you</h2><p>Studying abroad is not the only route. If the checklist above raises serious doubts, consider a programme closer to home first, or a short Chinese-language course to test the experience before committing to a full degree.</p>',

            'best-cities-to-study-in-china-for-international-students' => '<h2>How the cities compare on climate</h2><p>Northern cities have long, cold winters with heating indoors, while southern cities are warmer and more humid with milder winters. Coastal cities have a maritime climate; inland cities show a wider swing between seasons. Check the climate of your city for the months you will be there before you buy a winter wardrobe.</p>'
                .'<h2>Cost of living</h2><p>Rent, food and local transport are usually highest in the largest coastal cities and lower in inland and provincial capitals. The dormitory price is a better guide than the city name: compare what each university charges for a bed and what is included.</p>'
                .'<h2>Getting around and getting home</h2><p>Look at the distance from the airport to your campus and at direct flights to your home country. A city with a large airport saves time and money every year you travel home.</p>'
                .'<h2>International community</h2><p>Cities with many universities tend to have larger international communities, more shops that stock familiar food and more clubs and societies. A student alone in a small city can still do very well, but expect to learn more Chinese earlier.</p>'
                .'<h2>Safety and student life</h2><p>University districts are usually busy and well lit, with campus security. Ask the international office about student associations and orientation, which are good places to meet other international students and find housing advice.</p>'
                .'<h2>Questions to ask before you choose</h2><ol><li>Which universities in this city teach my subject in my language?</li><li>What does the dormitory cost and include?</li><li>How cold or hot is it in the months I will be there?</li><li>How far is the nearest international airport?</li><li>Which student groups would I join?</li></ol>'
                .'<h2>Ask for local advice</h2><p>Before you commit, ask the university to put you in touch with a current international student in that city. First-hand answers about rent, winter and daily costs are worth more than any ranking.</p>',

            'china-university-application-deadlines-2027-intakes' => '<h2>A note on fees in these notices</h2><p>The tuition and fee figures above come directly from each university&rsquo;s notice and apply to that programme and year only. Do not use them as a general guide for other universities.</p>',
        ];
    }

    /**
     * A third layer: practical question-and-answer sections, unique to each article.
     *
     * @return array<string, string>
     */
    private function thirdExtras(): array
    {
        return [
            'moe-approves-43-universities-english-mbbs-2026-27' => '<h2>More answers</h2><h3>Is every university on the list equally good?</h3><p>No. The list says a university may recruit; it does not rank quality. Compare hospitals, class size and support for international students yourself.</p><h3>What if my chosen university is not on the list?</h3><p>It may not recruit English-taught MBBS students. Ask the university for its authorisation in writing, and consider an approved alternative.</p><h3>Will the 2027 list be the same?</h3><p>Not necessarily. The Ministry publishes the list for each academic year, so check it again before you apply.</p>',

            'mbbs-in-china-guide-international-students' => '<h2>More answers</h2><h3>How do I know the fee I am quoted is honest?</h3><p>Ask for a written notice from the university, with each year and each item listed, and compare it with the programme page. Be wary of any figure that exists only in a message from an agent.</p><h3>Can I transfer between universities later?</h3><p>Transfers are difficult and depend on both universities and on the Ministry rules. Choose carefully the first time instead of planning to move.</p><h3>Do I need to speak Chinese before I arrive?</h3><p>No, but starting early helps. Many universities teach Chinese from the first year.</p>',

            'csc-scholarship-guide-how-to-apply' => '<h2>More answers</h2><h3>Can I hold a CSC award and another scholarship?</h3><p>Rules differ by award. Read the terms of each one, and ask the university before you accept a second award.</p><h3>Is the Chinese Government Scholarship only for degree study?</h3><p>It covers several kinds of study, including degree programmes and some language and non-degree programmes. The notice for each year lists what is open.</p><h3>Does a CSC scholarship guarantee a place at a particular university?</h3><p>No. The scholarship and the university admission are linked but separate decisions, and both must succeed.</p>',

            'china-x1-student-visa-guide' => '<h2>More answers</h2><h3>Can I enter China on a tourist visa and change to a student visa?</h3><p>This is generally not allowed and can cause serious trouble. Apply for the correct student visa in your home country before you travel.</p><h3>What if my passport expires during my studies?</h3><p>Renew it before you travel or soon after you arrive, and tell the international office, because your residence permit is linked to the passport.</p><h3>Do I need a new visa for each year of study?</h3><p>Once your X1 is converted into a residence permit, the permit is renewed through the university, not by repeating the visa process abroad. Ask the international office about the timing each year.</p>',

            'study-in-china-admission-requirements-and-costs' => '<h2>More answers</h2><h3>Do all universities charge an application fee?</h3><p>No. Some charge a fee, as the notices above show, and others do not. Confirm it on the official page and pay only to the account the university gives.</p><h3>Are the tuition figures per year or per semester?</h3><p>They are recorded as published by each university, and the unit differs. Always read the unit on the programme page before you compare two figures.</p><h3>Can I pay in instalments?</h3><p>Some universities allow it and some do not. Ask in writing and keep the reply.</p><h3>Is a scholarship the only way to lower my costs?</h3><p>It is the largest one, but choosing a lower-cost city and applying to universities with lower tuition also helps. Compare the full cost, not just the tuition.</p>',

            'mbbs-in-china-2027-how-to-prepare-and-apply' => '<h2>More answers</h2><h3>Can I change my shortlist later?</h3><p>Yes. A shortlist is a working list. Update it when you receive new information, such as the Ministry list for your year or a fee notice.</p>',

            'study-medicine-in-china-mbbs-bds-tcm' => '<h2>More answers</h2><h3>Is TCM recognised in my country?</h3><p>Recognition varies widely. Check with the authority that regulates traditional medicine where you plan to practise.</p><h3>Can I switch from one health programme to another?</h3><p>It depends on the university and the programme. Ask before you enrol, rather than assuming it will be possible.</p><h3>Which subject is best to study before applying?</h3><p>Strong results in biology and chemistry help for every health programme. Check each programme page for the subjects it asks for.</p>',

            'masters-in-china-for-international-students' => '<h2>More answers</h2><h3>Can I switch from a master&rsquo;s to a PhD later?</h3><p>Many students do. Ask whether the university offers a continuing route and what grade it expects.</p><h3>Do I need an interview?</h3><p>Some programmes interview applicants, often online. The programme page or the international office will say so.</p>',

            'phd-in-china-for-international-students' => '<h2>More answers</h2><h3>How many references do I need?</h3><p>Most programmes ask for two or three. Ask people who have seen your research.</p><h3>Can I change supervisors?</h3><p>It is possible but not easy. Choose carefully at the start and discuss expectations before you accept.</p>',

            'scholarship-guidance-how-to-choose-and-apply' => '<h2>More answers</h2><h3>Should I apply to many scholarships?</h3><p>Apply to every one you qualify for, but write each application with care. A few well-prepared applications beat many hurried ones.</p><h3>Do I need to pay an application fee for a scholarship?</h3><p>Read the notice to see whether any fee applies; official notices state it. Be cautious about any third party that asks for payment to secure an award.</p><h3>What if I miss a deadline?</h3><p>Ask the university whether a later round or another award exists, and plan earlier for the next cycle.</p>',

            'scholarships-to-study-in-china-every-route-explained' => '<h2>More answers</h2><h3>Which type of scholarship has the most awards?</h3><p>In our catalog the largest groups are university, provincial and municipal scholarships, as the table above shows. Government-level awards are fewer but widely known.</p><h3>Do I need to speak Chinese to win a scholarship?</h3><p>Not for English-taught programmes. For Chinese-taught programmes you usually need an HSK result.</p><h3>How do I find awards that are not on the general lists?</h3><p>Open the page of each university on your shortlist and read its scholarship section, then write to its international office with a specific question.</p>',

            'csc-scholarship-checklist-documents-and-timeline' => '<h2>More answers</h2><h3>Can I submit documents in a language other than English or Chinese?</h3><p>Usually they need a certified translation. Check the notice for the exact rule.</p><h3>How long should my study plan be?</h3><p>Follow the length stated in the notice. If none is stated, a clear page or two is a sensible aim.</p><h3>Who should write my recommendation letters?</h3><p>Teachers or supervisors who know your work. Give them your CV and plan, and the deadline, early.</p>',

            'study-in-china-complete-guide-for-international-students' => '<h2>More answers</h2><h3>Can I study in China on a tourist visa?</h3><p>No. A degree needs a student visa. See the <a href="/site/news/china-x1-student-visa-guide">X1 visa guide</a>.</p><h3>Do universities help with accommodation?</h3><p>Most offer dormitories for international students. Ask about the price, what is included and how to book.</p><h3>How do I pick between two good offers?</h3><p>Compare the full cost, the programme and supervisor, the city and the scholarship terms, and ask a counselor to review them with you.</p>',

            'study-abroad-in-china-is-it-right-for-you' => '<h2>More answers</h2><h3>How do I prepare my family?</h3><p>Share your plan, the budget and the contact details of the international office, and agree how often you will talk.</p><h3>What should I pack?</h3><p>Pack for the climate of your city, bring documents in a separate folder, and buy bulky items locally.</p><h3>What if I feel homesick?</h3><p>It is common. Join student groups, keep a routine and talk to the international office or the university counselling service early.</p>',

            'best-cities-to-study-in-china-for-international-students' => '<h2>More answers</h2><h3>Is a large city always better for international students?</h3><p>Not always. Large cities offer more choice and a larger international community, but cost more. A smaller city can offer a lower budget and more daily Chinese practice.</p><h3>Can I change city after I start?</h3><p>Moving means changing university, so choose with care before you enrol.</p><h3>How do I compare two cities fairly?</h3><p>Use the same questions for both: the fee notice, the dormitory price, the climate, the airport and the programmes in your subject.</p>',

            'china-university-application-deadlines-2027-intakes' => '<h2>More answers</h2><h3>Why do some notices give no opening or closing date?</h3><p>Some universities publish only part of the schedule. When a date is missing, ask the international office in writing and keep the reply.</p><h3>What if I miss the deadline?</h3><p>Ask the university whether a later round or the next intake is open. Do not assume that you are excluded.</p><h3>Is the earlier scholarship deadline always shown?</h3><p>Not always. Check the scholarship page of the university and its international office.</p>',
        ];
    }

    /**
     * A fourth layer: short glossaries and action lists, unique to each article.
     *
     * @return array<string, string>
     */
    private function fourthExtras(): array
    {
        return [
            'moe-approves-43-universities-english-mbbs-2026-27' => '<h2>Terms used in this announcement</h2><ul><li><strong>Ministry of Education (MoE):</strong> the national authority that sets rules for universities, including who may recruit international students in English-taught medicine.</li><li><strong>Clinical Medicine:</strong> the official name of the undergraduate medical degree; MBBS is the name used abroad.</li><li><strong>Academic year 2026&ndash;27:</strong> the year starting in autumn 2026, which is the intake this list covers.</li><li><strong>Recruit:</strong> to admit and enrol international students into the programme, as opposed to simply teaching it.</li></ul>',

            'csc-scholarship-guide-how-to-apply' => '<h2>Terms you will meet</h2><ul><li><strong>CSC:</strong> the China Scholarship Council, which administers the Chinese Government Scholarship.</li><li><strong>Type A and Type B:</strong> the two application channels, through your government or directly through a university.</li><li><strong>Stipend:</strong> a monthly living allowance paid to some scholars.</li><li><strong>Study plan:</strong> the document in which you explain what you will study, why, and what you will do afterwards.</li></ul>',

            'study-in-china-admission-requirements-and-costs' => '<h2>Terms you will meet</h2><ul><li><strong>Tuition:</strong> the teaching fee, normally quoted per year or per semester.</li><li><strong>Dormitory:</strong> university accommodation, quoted separately from tuition.</li><li><strong>HSK:</strong> the standard test of Chinese for non-native speakers.</li><li><strong>JW201 and JW202:</strong> visa application forms issued by the university with the admission notice.</li><li><strong>Residence permit:</strong> the permit you receive after arrival that replaces the entry visa.</li></ul>',

            'phd-in-china-for-international-students' => '<h2>Terms you will meet</h2><ul><li><strong>Supervisor:</strong> the professor who guides your research and signs off your thesis.</li><li><strong>Research proposal:</strong> a plan describing your question, methods and timeline.</li><li><strong>Dissertation:</strong> the long written work that completes the degree.</li></ul>',

            'scholarships-to-study-in-china-every-route-explained' => '<h2>Terms you will meet</h2><ul><li><strong>Full scholarship:</strong> covers tuition and usually accommodation and a stipend.</li><li><strong>Partial scholarship:</strong> covers part of the cost.</li><li><strong>Provincial and municipal awards:</strong> funded by a local government for students in its area.</li><li><strong>Nomination:</strong> a university&rsquo;s recommendation of a candidate to a scholarship body.</li></ul><h2>Your next three actions</h2><ol><li>Write down your level, subject and the funding you need.</li><li>List every scholarship you qualify for, with its deadline.</li><li>Start the documents that take longest, such as certified transcripts.</li></ol>',

            'csc-scholarship-checklist-documents-and-timeline' => '<h2>Terms on a checklist</h2><ul><li><strong>Certified copy:</strong> a copy confirmed as true by an authority the notice accepts.</li><li><strong>Notarized:</strong> a document confirmed by a notary, sometimes also legalised by an embassy.</li><li><strong>Physical examination record:</strong> the official foreigner medical form completed by an approved hospital.</li><li><strong>Criminal record certificate:</strong> an official statement from your police authority.</li></ul><h2>Your next three actions</h2><ol><li>Open the official notice and list every document it names.</li><li>Order the certified copies and the criminal record certificate first.</li><li>Send your referees your CV, your plan and the deadline.</li></ol><h2>A last reminder</h2><p>Complete files are chosen before strong but incomplete ones. Finish every item, check every name, and submit early.</p>',

            'study-in-china-complete-guide-for-international-students' => '<h2>Terms you will meet</h2><ul><li><strong>Intake:</strong> a start date for a programme, usually spring or autumn.</li><li><strong>Admission notice:</strong> the university&rsquo;s official offer, needed for the visa.</li><li><strong>X1 visa:</strong> the long-term student visa for courses longer than 180 days.</li><li><strong>Residence permit:</strong> the permit that replaces the visa after arrival.</li></ul><h2>Your next three actions</h2><ol><li>Choose your level and subject.</li><li>Open <a href="/site/programs">programmes</a> and shortlist three.</li><li>Book a free consultation to check your plan.</li></ol>',

            'study-abroad-in-china-is-it-right-for-you' => '<h2>Terms you will meet</h2><ul><li><strong>International office:</strong> the university department that supports foreign students.</li><li><strong>Foundation year:</strong> a preparatory year, often in Chinese, before a degree.</li><li><strong>Residence permit:</strong> the permit that lets you stay for the length of your studies.</li></ul><h2>Your next three actions</h2><ol><li>Work through the checklist above and write down your answers.</li><li>Speak to a student who studied in China.</li><li>Read the <a href="/site/news/study-in-china-complete-guide-for-international-students">complete guide</a> and make a shortlist.</li></ol>',

            'best-cities-to-study-in-china-for-international-students' => '<h2>Terms you will meet</h2><ul><li><strong>Provincial capital:</strong> the main city of a province, often with several universities.</li><li><strong>Municipality:</strong> a city that is governed directly by the central government, such as Beijing and Shanghai.</li><li><strong>Dormitory:</strong> the university&rsquo;s accommodation, priced by the bed or room.</li></ul><h2>Your next three actions</h2><ol><li>Choose two or three cities that teach your subject in your language.</li><li>Ask each university for the dormitory price and a fee notice.</li><li>Open the <a href="/site/cities">cities page</a> to compare them.</li></ol>',

            'china-university-application-deadlines-2027-intakes' => '<h2>Terms you will meet</h2><ul><li><strong>Intake:</strong> a start date, usually spring (March) or autumn (September).</li><li><strong>Registration:</strong> the days on which admitted students arrive and enrol.</li><li><strong>Self-sponsored:</strong> a student who pays their own fees, rather than being funded by a scholarship.</li><li><strong>Non-degree programme:</strong> a course such as Chinese language that does not lead to a degree.</li></ul><h2>Your next three actions</h2><ol><li>Pick the intake you want to join.</li><li>List the deadline and the scholarship deadline of each university.</li><li>Start your certified documents now.</li></ol>',

            'masters-in-china-for-international-students' => '<h2>Terms you will meet</h2><ul><li><strong>Thesis:</strong> the research paper that completes many master&rsquo;s degrees.</li><li><strong>HSK:</strong> the standard test of Chinese for non-native speakers.</li><li><strong>Study plan:</strong> the document in which you set out your goals.</li></ul>',

            'study-medicine-in-china-mbbs-bds-tcm' => '<h2>Terms you will meet</h2><ul><li><strong>Stomatology:</strong> the Chinese programme name for dentistry.</li><li><strong>Internship:</strong> the supervised hospital period at the end of a clinical degree.</li><li><strong>Regulator:</strong> the authority that licenses doctors or dentists in your country.</li></ul>',

            'scholarship-guidance-how-to-choose-and-apply' => '<h2>Your next three actions</h2><ol><li>Write down your level, subject and the funding you need.</li><li>List the scholarships you qualify for and their deadlines.</li><li>Start the documents that take longest.</li></ol>',
        ];
    }

    /**
     * A final layer for the articles still near the length target.
     *
     * @return array<string, string>
     */
    private function fifthExtras(): array
    {
        return [
            'china-x1-student-visa-guide' => '<h2>Keep everything in order</h2><p>Put your passport, admission notice, JW form, photographs and examination record in one folder and carry them in your hand luggage. Take both the originals and a set of copies.</p>',

            'study-in-china-admission-requirements-and-costs' => '<h2>How to read a fee notice</h2><p>A good fee notice names the programme, the year, the currency, each charge and its due date. If any of those is missing, ask. A notice that arrives only as a chat message, with no university name or stamp, is not a notice; ask for the official document.</p><h2>Planning for the second year onwards</h2><p>Some universities raise fees or change accommodation prices each year. Ask whether the fee you are quoted is fixed for the programme, and keep a reserve for changes.</p>',

            'phd-in-china-for-international-students' => '<h2>Before you accept an offer</h2><p>Confirm in writing who your supervisor is, what funding you will receive, how long it lasts and what happens if the research takes longer than planned. Ask whether the department expects teaching duties, and how many hours.</p>',

            'scholarship-guidance-how-to-choose-and-apply' => '<h2>A calm way to approach the process</h2><p>Scholarships feel competitive, but the process is manageable when you break it into small, scheduled tasks. Do one task a day, keep one tracker, and ask for help early rather than late.</p>',

            'scholarships-to-study-in-china-every-route-explained' => '<h2>A last check before you apply</h2><p>Confirm the eligibility rules once more, check the deadline against your calendar, and save a copy of every document you submit. Then submit a few days early so that there is time to fix a problem.</p>',

            'csc-scholarship-checklist-documents-and-timeline' => '<h2>How a counselor can help</h2><p>A counselor can read your study plan, check that your documents match the notice and flag missing items before you submit. CAS offers <a href="/site/services#scholarships">scholarship assistance</a>, but the decision to award a scholarship always belongs to the awarding body, and nobody can guarantee it.</p><h2>Keep your options open</h2><p>Apply to more than one scholarship where the rules allow it, and keep a self-funded plan as a back-up. That way, a decision that does not go your way does not end your plans for the year.</p>',

            'study-in-china-complete-guide-for-international-students' => '<h2>How CAS can help</h2><p>CAS is an authorized agent that places international students into Chinese universities. We help you compare programmes, prepare documents, apply, and plan the visa and arrival. Our <a href="/site/services">services page</a> lists everything we do, and you can <a href="/site/study-plan">request a free study plan</a>.</p>',

            'study-abroad-in-china-is-it-right-for-you' => '<h2>A final thought</h2><p>The students who thrive abroad are usually the ones who prepared: they knew why they chose their programme, understood the costs, learned a little of the language and asked for help early. If that sounds like you, China can be a very good place to study. If you are unsure, talk to a counselor and to a student who has done it before you decide.</p><h2>How CAS can help</h2><p>CAS offers free counselling for prospective students. <a href="/site/contact">Contact us</a> or <a href="/site/study-plan">request a study plan</a>.</p>',

            'best-cities-to-study-in-china-for-international-students' => '<h2>How CAS can help</h2><p>If you are choosing between cities, a counselor can compare the universities in each for your subject and budget, and tell you what we know about their fee notices and intakes. <a href="/site/contact">Contact us</a> or <a href="/site/study-plan">request a free study plan</a>.</p>',

            'china-university-application-deadlines-2027-intakes' => '<h2>How CAS tracks deadlines</h2><p>We record each intake with the official source and the date we checked it, so that the deadline shown on a programme page can be traced to the university&rsquo;s own notice. When a university changes a date, we update the record. You should still confirm the date with the university before you pay or apply.</p><h2>Plan your documents around the earliest date</h2><p>Work out the earliest relevant deadline for your shortlist, including any scholarship deadline, and work backwards. Certified documents, translations and the medical examination are the steps most likely to cause delay, so start with them.</p><h2>Who should use this page</h2><p>This roundup is useful if you plan to start in 2027 and want to see how real intake schedules look, from a spring Chinese-language course to a September degree. Treat it as a guide to the type of information you should collect from each university, not as a substitute for the university&rsquo;s own notice.</p><h2>Report a change</h2><p>If you see a university update its dates, tell your counselor so that we can verify and update our record.</p>',
        ];
    }
}

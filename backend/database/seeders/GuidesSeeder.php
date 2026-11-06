<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * CAS Admission Guides: original explainers written by CAS. Facts that change
 * every year (fees, deadlines) are never typed here; the guides point to the
 * live catalog pages instead, and the university list is built from the catalog.
 *
 * Idempotent: keyed on slug.
 */
class GuidesSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->guides() as $g) {
            Post::updateOrCreate(['slug' => $g['slug']], [
                'type' => 'news',
                'title' => $g['title'],
                'excerpt' => $g['excerpt'],
                'body' => $g['body'],
                'category' => 'CAS Admission Guide',
                'cover_image_path' => '/images/header-default-v2.webp',
                'status' => 'published',
                'published_at' => $g['date'],
            ]);
        }
    }

    private function mbbsList(): string
    {
        $rows = University::where('moe_listed', true)
            ->whereHas('programs', fn ($q) => $q->where('registry_only', false)->where('teaching_language', 'English')->where('name', 'like', '%MBBS%'))
            ->orderBy('name')->get(['name', 'slug', 'city']);

        return '<ul>'.$rows->map(fn ($u) => '<li><a href="/site/universities/'.e($u->slug).'">'.e($u->name).'</a> ('.e($u->city).')</li>')->implode('').'</ul>';
    }

    /** @return list<array<string, string>> */
    private function guides(): array
    {
        $mbbs = $this->mbbsList();

        return [
            [
                'slug' => 'mbbs-in-china-guide-international-students',
                'title' => 'MBBS in China: a complete guide for international students',
                'excerpt' => 'How English-taught MBBS works in China: who may recruit, how long it takes, how to choose a university, what to check on recognition, and the steps from application to arrival.',
                'date' => '2026-11-06 09:00:00',
                'body' => '<p>China&rsquo;s medical degree for foreign students is called Clinical Medicine, and the English-taught version is marketed as MBBS. This guide explains how the route works so you can compare universities with clear eyes.</p>'
                    .'<h2>Only approved universities may recruit</h2><p>The Ministry of Education publishes an annual list of universities approved to enrol international undergraduates in English-taught Clinical Medicine. A university that is not on the list may not recruit English-taught MBBS students. In the CAS catalog, universities on the current list are marked, and the programme pages show the language, duration and application window we have confirmed.</p>'
                    .'<h2>Universities in the CAS catalog offering English-taught MBBS</h2>'.$mbbs
                    .'<h2>Length and structure</h2><p>English-taught MBBS programmes in our catalog run for six years, which includes clinical training and internship. Chinese-taught Clinical Medicine usually runs five years and requires strong Chinese (HSK) results. Check each programme page for the exact duration.</p>'
                    .'<h2>Fees</h2><p>Tuition and living costs differ by university and city, and they change from year to year. We do not quote a single &ldquo;MBBS fee&rdquo; because it would mislead you. Open the programme page of each university on CAS for the current figure, and ask the university to confirm accommodation, insurance and any clinical-training charges in writing.</p>'
                    .'<h2>Recognition: check this before you pay anything</h2><p>A Chinese medical degree is only useful if your home country lets you practise with it. Rules differ by country and change over time, so check the current requirements of your national medical regulator (for example, the licensing authority and any screening exam for foreign graduates) before you apply, and confirm that the university and programme are on the Ministry of Education list. CAS can explain the process but your regulator&rsquo;s own notices are the authority.</p>'
                    .'<h2>Typical requirements</h2><ul><li>High-school completion with strong science results (biology, chemistry, usually physics)</li><li>Valid passport and a clean criminal record certificate</li><li>English-language evidence if your schooling was not in English (the university states which test it accepts)</li><li>A medical examination, completed on the official foreigner form</li></ul>'
                    .'<h2>Step by step</h2><ol><li>Shortlist universities from the approved list and read the programme page.</li><li>Check intake dates; most universities recruit once a year for September.</li><li>Prepare documents and submit the online application.</li><li>Receive the admission notice and the visa application form (JW201 or JW202).</li><li>Apply for the X1 student visa; see our <a href="/site/news/china-x1-student-visa-guide">X1 visa guide</a>.</li><li>Travel, register on campus and convert the visa into a residence permit.</li></ol>'
                    .'<p>Ready to start? Browse <a href="/site/programs">programmes</a> or <a href="/site/contact">talk to a CAS counselor</a>.</p>',
            ],
            [
                'slug' => 'csc-scholarship-guide-how-to-apply',
                'title' => 'CSC scholarship: types, eligibility and how to apply',
                'excerpt' => 'A plain explanation of the Chinese Government Scholarship (CSC): the two application channels, what it normally covers, how deadlines work, and common mistakes.',
                'date' => '2026-11-06 09:10:00',
                'body' => '<p>The Chinese Government Scholarship, run by the China Scholarship Council (CSC), is the best-known funding route for international students. Rules and numbers are published every year, so treat this guide as a map and confirm details on the official notice for your intake.</p>'
                    .'<h2>Two ways to apply</h2><ul><li><strong>Type A (bilateral programme):</strong> you apply through your own government or the Chinese embassy in your country, and the awarding body assigns places.</li><li><strong>Type B (university programme):</strong> you apply directly to a participating Chinese university, which nominates candidates.</li></ul>'
                    .'<h2>What it usually covers</h2><p>A full award typically covers tuition, accommodation (or an allowance), a monthly living stipend and comprehensive medical insurance. The exact amounts depend on the level of study and are set in the official announcement for the year. Not every award is a full one: some Type A and Type B places are partial, and universities describe their own Type B coverage differently, so read the notice of the specific university before you apply.</p>'
                    .'<h2>Deadlines</h2><p>Deadlines vary by channel and by university, and they usually fall in the first half of the year for the September intake. Universities in our catalog show the application window we have confirmed on their pages; always confirm the closing date with the university or the embassy as well, because scholarship windows can be shorter than general admission windows.</p>'
                    .'<h2>Documents you should expect to prepare</h2><ul><li>Passport, highest certificate and transcripts</li><li>Study plan or research proposal</li><li>Recommendation letters (for postgraduate applicants)</li><li>Medical examination record and a criminal record certificate</li><li>Language evidence where the programme requires it</li></ul>'
                    .'<h2>Common mistakes</h2><ul><li>Applying to the wrong channel and missing the other&rsquo;s deadline</li><li>Choosing a programme that is not open to scholarship students</li><li>A generic study plan; committees read many of them</li><li>Paying anyone for a &ldquo;guaranteed&rdquo; award. Awards cannot be bought.</li></ul>'
                    .'<p><em>Checked against university scholarship pages in November 2026. The official programme pages on campuschina.org and the notice for your intake are the final word.</em></p>'
                    .'<p>Browse <a href="/site/scholarships">scholarships on CAS</a> or see the <a href="/site/news/mbbs-in-china-guide-international-students">MBBS guide</a> if you are aiming for medicine.</p>',
            ],
            [
                'slug' => 'china-x1-student-visa-guide',
                'title' => 'China student visa (X1): documents and steps',
                'excerpt' => 'What the X1 and X2 student visas are, which documents you need, and what to do after you arrive in China.',
                'date' => '2026-11-06 09:20:00',
                'body' => '<p>Once a Chinese university has admitted you, the next step is the student visa. Embassies and visa centres set their own detailed procedures, so use this as a checklist and confirm the current rules with the Chinese embassy or visa centre that serves you.</p>'
                    .'<h2>X1 or X2?</h2><ul><li><strong>X1:</strong> for study of more than 180 days. It is usually valid for a single entry and for 30 days after you arrive, and during that time it must be converted into a residence permit.</li><li><strong>X2:</strong> for study of 180 days or less. Holders of an X2 normally do not apply for a residence permit.</li></ul>'
                    .'<h2>Documents commonly required</h2><ul><li>Passport with enough validity and blank pages</li><li>Visa application form completed online and printed</li><li>Passport-style photo that meets the specification</li><li>The original Admission Notice from the university</li><li>The Visa Application for Study in China form: <strong>JW201</strong> is normally issued to students on a Chinese government scholarship and <strong>JW202</strong> to other students. For a short X2 stay some universities use a different form, so use the one your university sends you.</li><li>Foreigner Physical Examination Record, usually required for stays of more than six months</li><li>Any extra items your embassy asks for, such as a criminal record certificate</li></ul>'
                    .'<h2>Steps</h2><ol><li>Receive the admission notice and the visa application form from the university.</li><li>Complete the visa application form and book an appointment.</li><li>Submit documents and biometrics.</li><li>Collect the visa and check the entry deadline printed on it.</li><li>Arrive, register at the university, and apply for the residence permit. With an X1 the 30 days run from the day you enter China, and that day counts, so do not leave it late.</li></ol>'
                    .'<h2>Tips</h2><ul><li>Start the medical examination early; it can take days to complete.</li><li>Keep scans of every document.</li><li>Do not enter on a tourist visa intending to study; a tourist visa generally cannot be converted into a student residence permit.</li><li>Missing the residence-permit window can lead to fines or other penalties, so ask your university how it handles the application.</li></ul>'
                    .'<p><em>Checked against the visa guidance of several Chinese universities in November 2026. Rules and document lists differ by embassy and change, so confirm with the Chinese embassy or visa centre that serves you.</em></p>'
                    .'<p>Questions? <a href="/site/contact">Contact CAS</a>.</p>',
            ],
            [
                'slug' => 'study-in-china-admission-requirements-and-costs',
                'title' => 'Study in China: admission requirements, costs and work rules',
                'excerpt' => 'What international students need to apply, how to think about costs, whether you can work, and how to choose between English-taught and Chinese-taught programmes.',
                'date' => '2026-11-06 09:30:00',
                'body' => '<p>This overview answers the questions we hear most from students planning to study in China.</p>'
                    .'<h2>Admission requirements by level</h2><ul><li><strong>Bachelor:</strong> high-school graduation, usually with good grades; a language test for the teaching language.</li><li><strong>Master:</strong> a bachelor degree, transcripts, a study plan, often two recommendation letters.</li><li><strong>PhD:</strong> a master degree, a research proposal and recommendation letters; some universities ask for publications or a supervisor&rsquo;s acceptance.</li><li><strong>Chinese language:</strong> typically open to anyone with a high-school certificate.</li></ul>'
                    .'<h2>English-taught or Chinese-taught?</h2><p>English-taught programmes are easier to enter but limited in range. Chinese-taught programmes open far more choices and scholarships, but they require HSK results, often HSK 4 or higher. Many students take a one-year Chinese foundation course first.</p>'
                    .'<h2>Thinking about costs</h2><p>Budget for four things: tuition, accommodation, living expenses and health insurance, plus the one-off visa and medical costs. Tuition and accommodation differ widely by university and city, so compare the figures on each <a href="/site/programs">programme page</a> and ask the university for a written fee notice.</p>'
                    .'<h2>Can international students work?</h2><p>Study visas do not normally allow employment. Part-time work and internships need written approval from the university and the immigration authority, and the rules are applied differently from city to city. Do not plan your budget around earning in China.</p>'
                    .'<h2>Choosing a university</h2><ul><li>Check the programme is taught in your language and open to your nationality.</li><li>Look at the city: cost of living, climate and the number of international students.</li><li>Check scholarship availability and deadlines.</li></ul>'
                    .'<p>Next: read the <a href="/site/news/csc-scholarship-guide-how-to-apply">CSC scholarship guide</a> and the <a href="/site/news/china-x1-student-visa-guide">visa guide</a>, or <a href="/site/universities">browse universities</a>.</p>',
            ],
        ];
    }
}

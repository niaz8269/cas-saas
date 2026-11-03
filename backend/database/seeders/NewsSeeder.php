<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Public news items. Every post restates a fact taken from an official page
 * and links to it; nothing here is promotional filler. Add a post only when an
 * official source states the fact, and cite that source in the body.
 *
 * Idempotent: keyed on slug.
 */
class NewsSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->posts() as $post) {
            // Cover: the campus (or city) photo of the university the news is about,
            // or the site's hero photo for news that concerns all universities.
            $cover = isset($post['university'])
                ? University::where('slug', $post['university'])->value('cover_path')
                : '/images/hero-great-wall.webp';

            Post::updateOrCreate(
                ['slug' => $post['slug']],
                [
                    'type' => 'news',
                    'title' => $post['title'],
                    'excerpt' => $post['excerpt'],
                    'body' => $post['body'],
                    'category' => $post['category'],
                    'cover_image_path' => $cover,
                    'status' => 'published',
                    'published_at' => $post['date'],
                ],
            );
        }
    }

    /**
     * @return list<array<string, string>>
     */
    private function posts(): array
    {
        return [
            [
                'slug' => 'moe-approves-43-universities-english-mbbs-2026-27',
                'title' => 'MoE approves 43 universities to enrol English-taught MBBS students for 2026–27',
                'excerpt' => 'The Ministry of Education has published its list of universities approved to recruit international undergraduate Clinical Medicine (English-taught) students for the 2026–2027 academic year.',
                'category' => 'MBBS',
                'date' => '2026-06-24 09:00:00',
                'body' => '<p>The Ministry of Education\'s Department of International Cooperation and Exchanges has approved <strong>43 universities</strong> to recruit international undergraduate Clinical Medicine (English-taught, MBBS) students for the 2026–2027 academic year, including Jilin University, China Medical University and Dalian Medical University.</p>'
                    .'<p>Under the Ministry\'s rules, universities that are not on the annual list may not recruit English-taught MBBS students. Check the list before you apply: on this site, universities on it carry the “MoE-approved MBBS” badge, and you can filter the university list to show only them.</p>'
                    .'<p>Source: Ministry of Education letter 教外函〔2026〕65号, dated 24 June 2026 (copy published by the Embassy of India in Beijing).</p>',
            ],
            [
                'slug' => 'dalian-medical-university-spring-2027-applications-open',
                'university' => 'dalian-medical-university',
                'title' => 'Dalian Medical University: spring 2027 applications opened on 20 October 2026',
                'excerpt' => 'The international college opened online applications for its spring 2027 (March start) programs, including the pre-medical program and MBBS.',
                'category' => 'Admissions',
                'date' => '2026-10-20 09:00:00',
                'body' => '<p>Dalian Medical University\'s International Education College opened its online application system on 20 October 2026 for the <strong>spring 2027 (March 2027) intake</strong>. The programs listed are the Pre-medical Program and the undergraduate Clinical Medicine (MBBS) program.</p>'
                    .'<p>The university has not published a closing date in this notice. Applicants need high-school certificates and transcripts certified by the Chinese embassy or consulate (or notarized in China), a financial statement and a medical check-up.</p>'
                    .'<p>Source: Dalian Medical University International Education College, admission guide for 2027 (Spring), dated 21 September 2026.</p>',
            ],
            [
                'slug' => 'liaoning-petrochemical-university-spring-2027-applications',
                'university' => 'liaoning-petrochemical-university',
                'title' => 'Liaoning Petrochemical University: spring 2027 applications run from 1 November to 20 April',
                'excerpt' => 'The university publishes a yearly admission schedule: spring intake applications open on 1 November, autumn intake applications on 1 May.',
                'category' => 'Admissions',
                'date' => '2026-11-01 09:00:00',
                'body' => '<p>Liaoning Petrochemical University\'s International Education College publishes a recurring yearly schedule. For the spring intake, applications open on <strong>1 November</strong> and close on <strong>20 April</strong> of the following year, with registration from 1 March to 20 May. For the autumn intake, applications open on 1 May and close on 20 October, with registration from 1 September to 20 November. Short courses can be applied for at any time.</p>'
                    .'<p>Tuition per year: English-taught bachelor CNY 16,000; Chinese-taught bachelor CNY 14,500; master\'s CNY 19,000; Chinese language CNY 12,000. The application fee is CNY 800.</p>'
                    .'<p>Source: admission schedule and fee table on the college website.</p>',
            ],
            [
                'slug' => 'nuist-september-2027-applications-close-30-april',
                'university' => 'nanjing-university-of-information-science-and-technology',
                'title' => 'NUIST: applications for September 2027 close on 30 April 2027',
                'excerpt' => 'Nanjing University of Information Science and Technology lists 30 April 2027 as the deadline for university scholarships and self-sponsored study.',
                'category' => 'Admissions',
                'date' => '2026-10-30 09:00:00',
                'body' => '<p>The International Education office of Nanjing University of Information Science and Technology (NUIST) lists <strong>30 April 2027</strong> as the application deadline for university scholarships and self-sponsored programs. The online system may close earlier once capacity is reached.</p>'
                    .'<p>Application fee CNY 500. Tuition per year: bachelor CNY 15,000, master\'s CNY 20,000, doctoral CNY 25,000. The page does not give an opening date.</p>'
                    .'<p>Source: NUIST application procedures and fees.</p>',
            ],
            [
                'slug' => 'zust-march-2027-chinese-language-intake-closes-10-january',
                'university' => 'zhejiang-university-of-science-and-technology',
                'title' => 'ZUST: apply by 10 January 2027 for the March 2027 Chinese-language intake',
                'excerpt' => 'Zhejiang University of Science and Technology is taking applications for a one-semester Chinese-language program starting 8 March 2027.',
                'category' => 'Admissions',
                'date' => '2026-10-16 09:00:00',
                'body' => '<p>Zhejiang University of Science and Technology\'s School of International Education is accepting applications for its non-degree <strong>Chinese-language program</strong> for the spring semester running 8 March to 25 June 2027 (20 class hours a week). The application deadline is <strong>10 January 2027</strong>.</p>'
                    .'<p>Tuition is CNY 7,500 for the semester and the application fee is CNY 400. A double room in the international dormitory is CNY 600 per bed per month, for at least one semester.</p>'
                    .'<p>Source: ZUST School of International Education notice, published 16 October 2026.</p>',
            ],
        ];
    }
}

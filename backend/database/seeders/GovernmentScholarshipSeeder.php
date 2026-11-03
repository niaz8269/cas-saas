<?php

namespace Database\Seeders;

use App\Models\Scholarship;
use Illuminate\Database\Seeder;

/**
 * China-wide scholarships (not tied to one university), taken from the
 * scholarship pages on https://sas.cas.moe. Dates are stored only where the
 * source prints a full date with a year; otherwise they are described in text
 * and left null. Idempotent: keyed on slug.
 */
class GovernmentScholarshipSeeder extends Seeder
{
    private const VERIFIED_ON = '2026-11-03';

    private const PUBLIC = ['public', 'student', 'agent', 'counselor'];

    public function run(): void
    {
        foreach ($this->rows() as $r) {
            Scholarship::updateOrCreate(['slug' => $r['slug']], [
                'university_id' => null,
                'scope' => 'government',
                'name' => $r['name'],
                'type' => 'Government',
                'description' => $r['description'],
                'coverage' => $r['coverage'],
                'eligibility' => $r['eligibility'],
                'how_to_apply' => $r['how'],
                'apply_link' => $r['apply'],
                'application_open_date' => $r['opens'] ?? null,
                'deadline' => $r['closes'] ?? null,
                'source_url' => 'https://sas.cas.moe/scholarships/'.$r['sas'],
                'verified_on' => self::VERIFIED_ON,
                'visibility' => ['amount' => self::PUBLIC, 'coverage' => self::PUBLIC, 'deadline' => self::PUBLIC, 'how_to_apply' => self::PUBLIC],
                'status' => 'active',
            ]);
        }
    }

    /** @return list<array<string, mixed>> */
    private function rows(): array
    {
        return [
            [
                'slug' => 'chinese-government-scholarship-csc',
                'sas' => 'chinese-government-scholarship-csc/2026-27-call',
                'name' => 'Chinese Government Scholarship (CSC)',
                'description' => 'Chinese government scholarship for international students to study at universities in China, applied for online through the CSC "Study in China" portal. Opening dates and deadlines are set by each embassy or host university; for the 2026/27 round embassy notices opened from late October 2025 (US embassy: 16 February 2026; Canada deadline: 22 February 2026). No 2027/28 notice has been published yet.',
                'coverage' => 'Set by the Chinese government and host university',
                'eligibility' => "Non-Chinese citizens in good health who meet the admission requirements of the target university. 2026/27 call (Canada): age under 25 for bachelor, 35 master, 40 doctoral. HSK 3 for Chinese-taught bachelor, HSK 4 for Chinese-taught master/doctoral; bachelor applicants take the CSCA. Other countries' channels may differ.",
                'how' => 'Apply online via the CSC Study in China system, normally through the Chinese embassy or consulate in your country (agency number), with a pre-admission notice from the target university.',
                'apply' => 'https://www.campuschina.org/',
            ],
            [
                'slug' => 'chinese-government-scholarship-bilateral-type-a',
                'sas' => 'chinese-government-scholarship-bilateral-program-type-a/2026-intake-sun-yat-sen-university-guide',
                'name' => 'Chinese Government Scholarship: Bilateral Program (Type A)',
                'description' => 'Type A scholarship applied for through your home-country dispatching authority, usually the Chinese embassy or consulate, and the CSC portal. A 2026 university guide states applications run between early January and early April; the exact deadline is set each year by the dispatching authority.',
                'coverage' => 'Tuition, accommodation, living expenses, medical insurance',
                'eligibility' => 'Non-Chinese citizens with a valid foreign passport; generally no older than 25 (bachelor), 35 (master) or 40 (doctoral). Bachelor applicants take the CSCA; language proof is HSK for Chinese-taught programs.',
                'how' => "Apply through your country's dispatching authority and the CSC portal.",
                'apply' => 'https://iso.sysu.edu.cn/en/application/scholarship/1420675.htm',
            ],
            [
                'slug' => 'yenching-fellowship-2027',
                'sas' => 'yenching-academy-scholarship/2027-september-2027-intake',
                'name' => 'Yenching Fellowship (Yenching Academy, Peking University)',
                'description' => 'Two-year interdisciplinary master\'s in China Studies at Peking University for international candidates, September 2027 intake. The Academy states that Scholars receive full fellowships; the page does not itemise coverage. Contact: yca-admissions@pku.edu.cn.',
                'coverage' => 'Full fellowship (not itemised by the Academy)',
                'eligibility' => "At least a bachelor's degree in any field, or currently enrolled in one; non-Chinese citizen with a valid passport. English test required unless exempt (IELTS Academic 7.0, TOEFL iBT 100, Cambridge 185).",
                'how' => 'Apply online through the Yenching Academy admissions page. Interviews are held online in winter or early spring; dates not yet announced.',
                'apply' => 'https://yenchingacademy.pku.edu.cn/info/1040/4523.htm',
                'opens' => '2026-09-01',
                'closes' => '2026-11-30',
            ],
            [
                'slug' => 'zhejiang-university-doctoral-scholarship-routes',
                'sas' => 'zhejiang-university-doctoral-scholarship-routes-for-international-applicants/2026-intake',
                'name' => 'Zhejiang University: Doctoral Scholarship Routes for International Applicants',
                'description' => 'Doctoral application guide for non-Chinese citizens (3-4 years). Routes: CSC Type A and Type B, China-ASEAN Oceanic, China Studies fellowship, Zhejiang Government, ZJE Hai, Medicine, Optical Science and Engineering, and self-funded. 2026 deadlines (Beijing time): CSC Type B 31 Dec 2025; China-ASEAN Oceanic 31 May 2026; others 28 Feb 2026. The 2027 call has not been published; the opening date of the online system is not stated.',
                'coverage' => 'Varies by route; no amounts stated in the guide',
                'eligibility' => "Master's degree (student certificate accepted at application), non-Chinese citizen with an ordinary foreign passport, generally under 40, good conduct and health. Personal statement of at least 1,500 words, two recommendation letters; supervisor acceptance form for some programs. Application fee RMB 800, non-refundable.",
                'how' => 'Apply through the ZJU online application system for international students and contact potential supervisors in advance.',
                'apply' => 'https://iczu.zju.edu.cn/',
            ],
            [
                'slug' => 'tsinghua-graduate-scholarships-2027',
                'sas' => 'tsinghua-university-graduate-admissions-and-scholarships-for-international-students-cgs-and-bgs/2027-entry',
                'name' => 'Tsinghua University: Graduate Admissions and Scholarships (CGS and BGS), 2027 entry',
                'description' => "Master's and doctoral admissions for foreign nationals for 2027 entry. As of 7 September 2026 the application system was not yet open and was expected from mid-September 2026 to February 2027; each school sets its own deadline. Scholarships (Chinese Government Scholarship, Beijing Government Scholarship) are awarded after admission. Winter break 21 Jan-17 Feb 2027 may delay verification.",
                'coverage' => 'Awarded after admission (CGS and BGS routes)',
                'eligibility' => "Non-Chinese nationals with a valid foreign passport; bachelor's degree for master's, master's for doctoral (some schools admit bachelor's holders directly). Overseas degrees need CSCSE authentication before registration. RMB 800 non-refundable application fee.",
                'how' => "Apply online via the Tsinghua graduate admissions system for international students; deadlines are in each program's catalogue.",
                'apply' => 'https://yz.tsinghua.edu.cn/en/',
            ],
            [
                'slug' => 'schwarzman-scholars-class-2028',
                'sas' => 'schwarzman-scholars/2028-class-of-2028-2029',
                'name' => 'Schwarzman Scholars (Class of 2028-2029)',
                'description' => "English-taught master's program in China starting August 2028. Application period: April-September 2027 for US and global applicants; March-May 2027 for applicants with Chinese citizenship. Exact dates are not yet announced.",
                'coverage' => 'Not stated on the admissions page; see official FAQ',
                'eligibility' => 'Aged 18-28 on 1 August 2028; undergraduate degree in any field completed before then. Non-native English speakers need TOEFL iBT 100, IELTS 7, Cambridge 185 or Duolingo 130 unless they studied in English for two years. CV, 750-word leadership essay and further essay required.',
                'how' => 'Apply through the Schwarzman Scholars admissions portal when the period opens.',
                'apply' => 'https://www.schwarzmanscholars.org/admissions/application-instructions/',
            ],
            [
                'slug' => 'beijing-government-scholarship',
                'sas' => 'beijing-government-scholarship-for-international-students/2026-27',
                'name' => 'Beijing Government Scholarship for International Students',
                'description' => 'Scholarship from the Beijing municipal government for non-Chinese citizens at higher education institutions in Beijing. The host institution reviews applications; deadlines are determined by each institution (no central date).',
                'coverage' => 'Cat. A: full incl. living; B: tuition + housing; C: tuition',
                'eligibility' => 'Non-Chinese citizens. Age at enrolment: bachelor 25, master 35, doctoral 40, preparatory 24, visiting students 45, research scholars 50. HSK 4 for Chinese-taught degree programs; TOEFL 85 or equivalent for English-taught Category A.',
                'how' => 'Apply directly to the Beijing host institution.',
                'apply' => 'https://english.beijing.gov.cn/studyinginbeijing/news/202601/t20260123_4459326.html',
            ],
        ];
    }
}

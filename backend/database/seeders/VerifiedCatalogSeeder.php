<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\University;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * The public catalog: programs, intakes and scholarships for each university,
 * read from the university's own published pages where available.
 *
 * Notes for editing this file:
 *  - Leave a value null when it is not known; the site shows "to be announced"
 *    instead of a guess.
 *  - Dates are stored only when the full date, including the year, is known.
 *
 * Idempotent: universities are keyed on code; their catalog children are
 * replaced on every run.
 */
class VerifiedCatalogSeeder extends Seeder
{
    private const VERIFIED_ON = '2026-10-30';

    /** Show dates, fees and award details to every audience, including guests. */
    private const PUBLIC = ['public', 'student', 'agent', 'counselor'];

    public function run(): void
    {
        $cn = Country::where('iso2', 'CN')->first();

        foreach ($this->catalog() as $data) {
            $university = University::updateOrCreate(
                ['code' => $data['code']],
                [
                    'name' => $data['name'],
                    'slug' => Str::slug($data['name']),
                    'country_id' => $cn?->id,
                    'city' => $data['city'],
                    'address' => $data['address'] ?? null,
                    'website' => $data['website'],
                    'apply_link' => $data['apply_link'] ?? null,
                    'logo_path' => $data['logo'] ?? null,
                    'cover_path' => null,
                    'about' => $data['about'] ?? null,
                    'requirements' => $data['requirements'] ?? null,
                    'nearest_airport' => null,
                    'moe_listed' => false,
                    'representative_professor' => null,
                    'visibility' => ['deadlines' => self::PUBLIC],
                    'status' => 'active',
                ],
            );

            // Replace stale/placeholder children with the verified set.
            $university->agreements()->delete();
            $university->contacts()->delete();
            $university->scholarships()->forceDelete();
            $university->intakes()->delete();
            $university->programs()->forceDelete();

            foreach ($data['contacts'] ?? [] as [$name, $email, $role]) {
                $university->contacts()->create(['name' => $name, 'email' => $email, 'role' => $role]);
            }

            foreach ($data['programs'] ?? [] as $p) {
                $university->programs()->create([
                    'name' => $p['name'],
                    'level' => $p['level'],
                    'teaching_language' => $p['language'] ?? null,
                    'duration_months' => $p['months'] ?? null,
                    'tuition_fee' => $p['tuition'] ?? null,
                    'currency' => 'CNY',
                    'source_url' => $p['source'],
                    'verified_on' => self::VERIFIED_ON,
                    'visibility' => ['tuition_fee' => self::PUBLIC],
                    'status' => 'active',
                ]);
            }

            // Programs from the official CSC "Study in China" listing (campuschina.org),
            // added only where a hand-verified row for the same program doesn't exist.
            $have = collect($data['programs'] ?? [])->map(fn ($p) => Str::lower($p['name']).'|'.$p['level'])->flip();
            $csc = $this->cscPrograms()[$data['code']] ?? null;
            foreach ($csc['programs'] ?? [] as [$name, $level, $language, $months, $tuition]) {
                if ($have->has(Str::lower($name).'|'.$level)) {
                    continue;
                }
                $have->put(Str::lower($name).'|'.$level, true);
                $university->programs()->create([
                    'name' => $name,
                    'level' => $level,
                    'teaching_language' => $language,
                    'duration_months' => $months,
                    'tuition_fee' => $tuition,
                    'currency' => 'CNY',
                    'source_url' => $csc['source'],
                    'verified_on' => $csc['fetched'],
                    'visibility' => ['tuition_fee' => self::PUBLIC],
                    'status' => 'active',
                ]);
            }

            foreach ($data['intakes'] ?? [] as $i) {
                $university->intakes()->create([
                    'name' => $i['name'],
                    'start_date' => $i['start'] ?? null,
                    'application_open_date' => $i['opens'] ?? null,
                    'application_deadline' => $i['closes'] ?? null,
                    'status' => $i['status'],
                    'source_url' => $i['source'],
                    'verified_on' => self::VERIFIED_ON,
                ]);
            }

            foreach ($data['scholarships'] ?? [] as $s) {
                $university->scholarships()->create([
                    'name' => $s['name'],
                    'slug' => Str::slug($data['code'].' '.$s['name']),
                    'type' => $s['type'],
                    'coverage' => $s['coverage'] ?? null,
                    'amount' => $s['amount'] ?? null,
                    'currency' => isset($s['amount']) ? 'CNY' : null,
                    'stipend_monthly' => $s['stipend'] ?? null,
                    'description' => $s['description'],
                    'eligibility' => $s['eligibility'] ?? null,
                    'how_to_apply' => $s['how'] ?? null,
                    'apply_link' => $s['apply'] ?? null,
                    'application_open_date' => $s['opens'] ?? null,
                    'deadline' => $s['closes'] ?? null,
                    'source_url' => $s['source'],
                    'verified_on' => self::VERIFIED_ON,
                    'visibility' => [
                        'amount' => self::PUBLIC,
                        'coverage' => self::PUBLIC,
                        'deadline' => self::PUBLIC,
                        'how_to_apply' => self::PUBLIC,
                    ],
                    'status' => 'active',
                ]);
            }
        }
    }

    /**
     * Program rows scraped from campuschina.org: code => {source, fetched,
     * programs: [[name, level, language, months, tuition], ...]}.
     *
     * @return array<string, array<string, mixed>>
     */
    private function cscPrograms(): array
    {
        $path = database_path('data/csc_programs.json');

        return is_file($path) ? json_decode(file_get_contents($path), true) : [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function catalog(): array
    {
        $bitUg = 'http://isc.bit.edu.cn/docs//2025-10/4ac3a8207cc64b318d1336201984f472.pdf';
        $bitGrad = 'https://isc.bit.edu.cn/admissionsaid/financialaid/scholarships/958501cc93dd4cf285d0e903f24432da.htm';
        $nuistProg = 'https://gjy.nuist.edu.cn/english/ProgramsinEnglishMedium/list.htm';
        $nuistProgMaster = 'https://gjy.nuist.edu.cn/english/ProgramsinEnglishMedium/list2.htm';
        $nuistProc = 'https://gjy.nuist.edu.cn/english/ApplicationProcedures/list.htm';
        $zustFees = 'https://ies.zust.edu.cn/StudywithUS/Fees.htm';
        $dmuUg = 'https://iec.dmu.edu.cn/rxsq_l/Undergraduate_Programs.htm';
        $xjmuBrochure = 'https://iec.xjmu.edu.cn/info/1049/1267.htm';

        $nuistMasters = [
            'Meteorology', 'Applied Meteorology', 'Ecology', 'Hydraulic Engineering', 'Hydrometeorology',
            'Physical Oceanography', 'Environmental Science and Engineering', 'Artificial Intelligence',
            'Information and Communication Engineering', 'Computer Science and Technology',
            'Materials Science and Engineering', 'Finance', 'Library and Information Studies',
            'Engineering Management', 'Digital Economy', 'Business Management', 'English Language and Literature',
            'Discipline Teaching (English)', 'Modern Educational Technology', 'Mental Health Education',
        ];

        return [
            [
                'code' => 'BIT', 'name' => 'Beijing Institute of Technology', 'city' => 'Beijing',
                'address' => '5 Zhongguancun South Street, Haidian District, Beijing',
                'website' => 'www.bit.edu.cn', 'apply_link' => 'http://apply.isc.bit.edu.cn',
                'logo' => '/logos/bit.png',
                'about' => 'Beijing Institute of Technology, founded in 1940, describes itself in its 2026 undergraduate admission book as a "211", "985" and Double First-Class university. International students apply through its Office of International Students; English-taught undergraduate programs run on the Beijing campus, with Artificial Intelligence on the Zhuhai campus.',
                'requirements' => [
                    'Non-Chinese passport holder in good health; undergraduate applicants aged 18–25 (under-18s need a Beijing-resident guardian)',
                    'Bachelor: high-school graduate or above. Master: bachelor\'s degree, under 35. PhD: master\'s degree, under 40',
                    'English-taught: IELTS 6.0, TOEFL 85 or Duolingo 110. Chinese-taught: HSK 5 (180 or above)',
                    'Undergraduate applicants: CSCA transcript or registration proof (csca.cn)',
                    'Certified transcripts and diploma, passport copy, personal statement, physical examination record, financial guarantee letter, non-criminal record',
                ],
                'contacts' => [['International Students Office', 'undergraduate@bit.edu.cn', 'Undergraduate admissions']],
                'programs' => array_map(fn ($n) => ['name' => $n, 'level' => 'bachelor', 'language' => 'English', 'months' => 48, 'tuition' => 30000, 'source' => $bitUg], [
                    'Aeronautical and Astronautical Engineering', 'Automation', 'Computer Science and Technology',
                    'Mechatronics Engineering', 'Electronics Science and Technology', 'Mechanical Engineering',
                    'International Economics and Trade', 'Artificial Intelligence (Zhuhai campus)',
                ]),
                'intakes' => [
                    ['name' => 'Autumn 2026 — Undergraduate', 'closes' => '2026-06-01', 'status' => 'closed', 'source' => $bitUg],
                    ['name' => 'Autumn 2026 — Graduate (self-funded)', 'opens' => '2025-10-15', 'closes' => '2026-06-15', 'status' => 'closed', 'source' => $bitGrad],
                ],
                'scholarships' => [
                    [
                        'name' => 'Chinese Government Scholarship (CSC) — Type B, Graduate', 'type' => 'full',
                        'coverage' => 'Tuition, accommodation, monthly stipend and medical insurance', 'stipend' => 3000,
                        'description' => 'Full scholarship for graduate students selected by BIT (agency no. 10007). Stipend is CNY 3,000 per month for master\'s and CNY 3,500 for PhD students. Applications for the 2026 entry ran in two rounds: 15 Oct 2025 – 15 Feb 2026 and 16 Feb – 15 Apr 2026.',
                        'how' => 'Apply on the CSC system (studyinchina.csc.edu.cn) with agency no. 10007 and on apply.isc.bit.edu.cn.',
                        'apply' => 'https://studyinchina.csc.edu.cn', 'opens' => '2025-10-15', 'closes' => '2026-04-15', 'source' => $bitGrad,
                    ],
                    [
                        'name' => 'Beijing Government Scholarship', 'type' => 'government',
                        'coverage' => 'Category A: tuition, accommodation, stipend, insurance. B: tuition, accommodation, insurance. C: tuition, insurance',
                        'description' => 'Municipal scholarship for international students at the Beijing campus. The 2026 application deadline was 1 May 2026.',
                        'closes' => '2026-05-01', 'source' => $bitUg,
                    ],
                    [
                        'name' => 'BIT International Student Scholarship', 'type' => 'partial',
                        'coverage' => 'Awards by tier, from part-tuition up to tuition with accommodation, stipend and insurance',
                        'description' => 'University scholarship with several award tiers for new international students. The 2026 application deadline was 1 May 2026; see the BIT notice for the tier table.',
                        'closes' => '2026-05-01', 'source' => $bitUg,
                    ],
                    [
                        'name' => 'Guangdong Government Outstanding International Student Scholarship (Zhuhai campus)', 'type' => 'government',
                        'coverage' => 'CNY 10,000 per year (undergraduate); CNY 20,000 (master\'s); CNY 30,000 (PhD)', 'amount' => 10000,
                        'description' => 'Provincial scholarship for students at the BIT Zhuhai campus. The 2026 application deadline was 1 May 2026.',
                        'closes' => '2026-05-01', 'source' => $bitUg,
                    ],
                ],
            ],
            [
                'code' => 'NUIST', 'name' => 'Nanjing University of Information Science and Technology', 'city' => 'Nanjing',
                'address' => 'No. 219 Ningliu Road, Nanjing, Jiangsu 210044',
                'website' => 'www.nuist.edu.cn', 'apply_link' => 'http://nuist.17gz.org/member/login.do',
                'logo' => '/logos/nuist.png',
                'about' => 'Nanjing University of Information Science & Technology (南京信息工程大学) offers English-taught bachelor\'s, master\'s and doctoral programs to international students, applied for through its International Education office.',
                'requirements' => [
                    'Non-Chinese citizen in good health. Bachelor: high-school graduate under 25. Master: bachelor\'s degree, under 35. PhD: master\'s degree, under 40',
                    'Chinese-taught: HSK 4 (210+) for bachelor, HSK 5 for master/PhD. English-taught: TOEFL iBT 80+, IELTS 6+ or Duolingo 100+',
                    'Undergraduate applicants: CSCA certificate (csca.cn)',
                    'Passport, highest degree, transcripts, study plan or research proposal, physical exam (valid 6 months), bank statement; master/PhD also two recommendation letters',
                    'Application fee CNY 500 (non-refundable); insurance CNY 600 per year; single-room accommodation CNY 4,000 per year',
                ],
                'contacts' => [['International Education Office', 'oie@nuist.edu.cn', 'Admissions']],
                'programs' => array_merge(
                    array_map(fn ($n) => ['name' => $n, 'level' => 'bachelor', 'language' => 'English', 'tuition' => 15000, 'source' => $nuistProg], [
                        'Atmospheric Science', 'Artificial Intelligence', 'Computer Science and Technology',
                        'Electronic Information Engineering', 'International Economy and Trade',
                    ]),
                    array_map(fn ($n) => ['name' => $n, 'level' => 'master', 'language' => 'English', 'tuition' => 20000, 'source' => $nuistProgMaster], $nuistMasters),
                    [['name' => 'Doctoral programs', 'level' => 'phd', 'language' => 'English', 'tuition' => 25000, 'source' => 'https://gjy.nuist.edu.cn/english/PhwDPrograms/list.htm']],
                ),
                'intakes' => [
                    ['name' => 'September 2027 intake (self-sponsored and university scholarships)', 'closes' => '2027-04-30', 'status' => 'open', 'source' => $nuistProc],
                ],
                'scholarships' => [
                    [
                        'name' => 'NUIST Longshan Scholarship A Class (Excellent Freshmen)', 'type' => 'partial',
                        'coverage' => 'Tuition waiver (full or 50%); accommodation and stipend at higher levels',
                        'description' => 'Bachelor: full or 50% tuition. Master: tuition, plus accommodation for first class. PhD: tuition and accommodation, plus CNY 2,500 per month for first class. University-funded award for new international students with a CGPA of at least 3.0/4 (or 80/100). The university application page lists 30 April 2027 as the deadline for university scholarships and self-sponsored study; the system can close earlier once capacity is reached.',
                        'eligibility' => 'Non-Chinese; age under 25 (bachelor), 35 (master), 40 (PhD); no concurrent Chinese government scholarship.',
                        'closes' => '2027-04-30', 'source' => 'https://gjy.nuist.edu.cn/english/NUISTExcellentFreshmenScholarship/list.htm',
                    ],
                    [
                        'name' => 'Chinese Government Scholarship — High-Level Postgraduate Program (CSC)', 'type' => 'full',
                        'coverage' => 'Tuition, dormitory, medical insurance and a monthly stipend', 'stipend' => 3000,
                        'description' => 'Stipend CNY 3,000 per month (master) or CNY 3,500 (PhD). The university notice, updated 23 Oct 2026, gives an annual application window of 1 December to 15 February with interviews in February–March; it does not name the year, so confirm the exact dates with NUIST.',
                        'eligibility' => 'Master: under 35. PhD: under 40. HSK 5 or English-language proof.',
                        'source' => 'http://gjy.nuist.edu.cn/english/2022/1011/c3756a206794/page.htm',
                    ],
                    [
                        'name' => 'Chinese Government Scholarship — WMO Program', 'type' => 'full',
                        'coverage' => 'Tuition, dormitory, insurance and a monthly stipend; WMO pays the flight', 'stipend' => 3000,
                        'description' => 'For candidates nominated by their country\'s WMO Permanent Representative. The university notice gives a deadline of 31 March (year not stated on the page); applicants apply to both NUIST and WMO.',
                        'eligibility' => 'Master: under 35. PhD: under 40. CGPA 3.0/4. WMO nomination required.',
                        'source' => 'http://gjy.nuist.edu.cn/english/2017/1211/c3756a122996/page.htm',
                    ],
                    [
                        'name' => 'NUIST–WMO Fellowships', 'type' => 'full',
                        'coverage' => 'Tuition, dormitory, insurance and a CNY 2,000 monthly stipend; WMO pays the flight', 'stipend' => 2000,
                        'description' => 'Fellowships for WMO-nominated master\'s and PhD students. The university notice gives a deadline of 31 March (year not stated on the page).',
                        'source' => 'https://gjy.nuist.edu.cn/english/NUISTwWMOFellowshipsEducationProgram/list.htm',
                    ],
                ],
            ],
            [
                'code' => 'ZUST', 'name' => 'Zhejiang University of Science and Technology', 'city' => 'Hangzhou',
                'address' => 'No. 318 Liuhe Road, Xihu District, Hangzhou 310023',
                'website' => 'www.zust.edu.cn', 'apply_link' => 'https://isam.zust.edu.cn',
                'logo' => '/logos/zust.png',
                'about' => 'Zhejiang University of Science and Technology (浙江科技大学) in Hangzhou enrols international students in Chinese language, bachelor\'s and master\'s programs through its School of International Education.',
                'requirements' => [
                    'Undergraduate: non-Chinese citizen under 35 with a high-school diploma; no criminal record; good health',
                    'English-taught undergraduate: IELTS 5.5 / TOEFL 80 or the ZUST English test. Chinese-taught: HSK 4 (180)',
                    'Undergraduate applicants: CSCA exam (csca.cn)',
                    'Master\'s: bachelor\'s degree, under 45; English-taught IELTS 6.0 / TOEFL 85; Chinese-taught HSK 5 (180); study plan',
                    'Notarized diploma and transcripts, passport valid at least 12 months, police clearance, medical exam, one-year financial proof',
                    'Application fee CNY 400; insurance CNY 800 per year',
                ],
                'contacts' => [['School of International Education', 'internationaloffice@126.com', 'Admissions']],
                'programs' => array_merge(
                    [
                        ['name' => 'Chinese Language Program (one semester)', 'level' => 'language', 'language' => 'Chinese', 'months' => 6, 'tuition' => 7500, 'source' => $zustFees],
                        ['name' => 'International Economics and Trade', 'level' => 'bachelor', 'language' => 'English', 'months' => 48, 'tuition' => 18000, 'source' => $zustFees],
                        ['name' => 'Architecture', 'level' => 'bachelor', 'language' => 'English', 'months' => 60, 'tuition' => 21000, 'source' => $zustFees],
                        ['name' => 'Visual Communication Design', 'level' => 'bachelor', 'language' => 'English', 'months' => 48, 'tuition' => 24000, 'source' => $zustFees],
                    ],
                    array_map(fn ($n) => ['name' => $n, 'level' => 'bachelor', 'language' => 'English', 'months' => 48, 'tuition' => 20000, 'source' => $zustFees], [
                        'Civil Engineering', 'Computer Science and Technology', 'Digital Media Technology', 'Artificial Intelligence',
                        'Food Science and Engineering', 'Robotics Engineering', 'Data Science and Big Data Technology',
                    ]),
                    [
                        // Fees match the official table above.
                        ['name' => 'International Business', 'level' => 'bachelor', 'language' => 'English', 'months' => 48, 'tuition' => 18000, 'source' => 'https://zust.cucas.cn/program/'],
                        ['name' => 'Bioengineering', 'level' => 'bachelor', 'language' => 'English', 'months' => 48, 'tuition' => 20000, 'source' => 'https://zust.cucas.cn/program/'],
                    ],
                    [['name' => 'Master\'s programs (English-taught)', 'level' => 'master', 'language' => 'English', 'tuition' => 25000, 'source' => $zustFees]],
                ),
                'intakes' => [
                    ['name' => 'March 2027 — Chinese Language (non-degree)', 'start' => '2027-03-08', 'closes' => '2027-01-10', 'status' => 'open', 'source' => 'https://ies.zust.edu.cn/info/1271/4322.htm'],
                ],
                'scholarships' => [
                    [
                        'name' => 'Zhejiang Provincial Government Scholarship', 'type' => 'government',
                        'coverage' => 'Master\'s (Type A): CNY 30,000 per year. Undergraduate (Type B): CNY 20,000 per year', 'amount' => 20000,
                        'description' => 'Partial provincial award. The 2026–2027 application window ran 18 January – 30 May 2026; the next window has not yet been announced.',
                        'eligibility' => 'Master\'s applicants under 35; undergraduate applicants under 30.',
                        'opens' => '2026-01-18', 'closes' => '2026-05-30', 'source' => 'https://ies.zust.edu.cn/info/1271/4218.htm',
                    ],
                    [
                        'name' => 'ZUST Outstanding New Students Scholarship', 'type' => 'partial',
                        'coverage' => '100%, 70%, 50% or 30% of first-year tuition',
                        'description' => 'University award on admission. The 2026–2027 window ran 18 January – 30 May 2026; the next window has not yet been announced. A CNY 3,000 prepaid tuition deposit is required to become a candidate.',
                        'eligibility' => 'Master\'s applicants under 30; undergraduate applicants under 25.',
                        'opens' => '2026-01-18', 'closes' => '2026-05-30', 'source' => 'https://ies.zust.edu.cn/info/1271/4218.htm',
                    ],
                    [
                        'name' => 'Chinese Government Scholarship (CSC) — Type A and Type B', 'type' => 'full',
                        'coverage' => 'Tuition waiver, housing, stipend and medical insurance',
                        'description' => 'Full scholarship, applied for through the home government (Type A) or through ZUST (Type B). Pre-admission through isam.zust.edu.cn is required first. ZUST does not publish CSC dates on its scholarship page.',
                        'source' => 'https://ies.zust.edu.cn/info/1271/4218.htm',
                    ],
                    [
                        'name' => 'International Chinese Language Teachers Scholarship (Spring 2027, one semester)', 'type' => 'full',
                        'coverage' => 'Tuition, accommodation, living allowance and insurance',
                        'description' => 'For Chinese-language learners aged 16–35. The notice, published 14 October 2026, gives a deadline of 31 October for the March 2027 intake (year not written on the page); HSK 3 (180+) and an HSKK score are needed.',
                        'source' => 'https://ies.zust.edu.cn/info/1271/4321.htm',
                    ],
                ],
            ],
            [
                'code' => 'DMU', 'name' => 'Dalian Medical University', 'city' => 'Dalian',
                'address' => 'No. 9 West Section, Lvshun South Road, Dalian, Liaoning 116044',
                'website' => 'www.dmu.edu.cn', 'apply_link' => 'https://dmu.17gz.org',
                'logo' => '/logos/dmu.png',
                'about' => 'Dalian Medical University (大连医科大学) enrols international students in pre-medical, MBBS, stomatology and postgraduate medical programs through its International Education College.',
                'requirements' => [
                    'Online application with uploaded documents',
                    'High-school diploma and transcripts certified by the Chinese embassy/consulate or notarized in China',
                    'Financial proof or bank statement and a medical check-up',
                    'English-taught postgraduate applicants from non-English-speaking countries: IELTS 6.5 or TOEFL 90',
                    'Admission letter and JW202 are issued after fee payment',
                ],
                'contacts' => [['International Education College', 'dmunewstudent@163.com', 'New student admissions']],
                'programs' => [
                    ['name' => 'Pre-medical Program', 'level' => 'language', 'language' => 'English', 'months' => 6, 'tuition' => 15000, 'source' => 'https://iec.dmu.edu.cn/rxsq_l/Premedical_Programs.htm'],
                    ['name' => 'Clinical Medicine (MBBS)', 'level' => 'bachelor', 'months' => 72, 'tuition' => 42000, 'source' => $dmuUg],
                    ['name' => 'Clinical Medicine (Chinese-taught)', 'level' => 'bachelor', 'language' => 'Chinese', 'months' => 60, 'tuition' => 25000, 'source' => $dmuUg],
                    ['name' => 'Stomatology (BDS)', 'level' => 'bachelor', 'months' => 60, 'tuition' => 45000, 'source' => $dmuUg],
                    ['name' => 'Neurology', 'level' => 'master', 'months' => 36, 'tuition' => 41000, 'source' => 'https://iec.dmu.edu.cn/rxsq_l/Master_Programs.htm'],
                    ['name' => 'Epidemiology and Health Statistics', 'level' => 'master', 'months' => 36, 'tuition' => 41000, 'source' => 'https://iec.dmu.edu.cn/rxsq_l/Master_Programs.htm'],
                    ['name' => 'Anesthesiology', 'level' => 'master', 'months' => 36, 'tuition' => 41000, 'source' => 'https://iec.dmu.edu.cn/rxsq_l/Master_Programs.htm'],
                    ['name' => 'Social Medicine and Health Service Management', 'level' => 'master', 'months' => 36, 'tuition' => 41000, 'source' => 'https://iec.dmu.edu.cn/rxsq_l/Master_Programs.htm'],
                ],
                'intakes' => [
                    ['name' => 'Spring 2027 (March 2027 start)', 'opens' => '2026-10-20', 'status' => 'open', 'source' => 'https://iec.dmu.edu.cn/info/1012/1668.htm'],
                ],
                'scholarships' => [
                    [
                        'name' => 'Chinese Government Scholarship — High-Level Graduate Program (CSC, Type B)', 'type' => 'full',
                        'coverage' => 'Full scholarship under CSC standards',
                        'description' => 'For master\'s and doctoral applicants (DMU agency no. 10161). The 2026-entry application closed on 30 December 2025; the university has not yet announced the 2027 cycle.',
                        'eligibility' => 'Master: under 35 with a bachelor\'s degree. PhD: under 40 with a master\'s degree. GPA 3.0+. HSK 5 (180+) for Chinese programs or IELTS 6.5 / TOEFL 90 for English programs.',
                        'closes' => '2025-12-30', 'source' => 'https://iec.dmu.edu.cn/info/1012/1639.htm',
                    ],
                ],
            ],
            [
                'code' => 'XJMU', 'name' => 'Xinjiang Medical University', 'city' => 'Urumqi',
                'address' => 'No. 393 Xinyi Road, Urumqi, Xinjiang 830011',
                'website' => 'www.xjmu.edu.cn', 'apply_link' => 'https://admission.xjmu.edu.cn',
                'logo' => '/logos/xjmu.png',
                'about' => 'Xinjiang Medical University (新疆医科大学) in Urumqi has enrolled international students since 1993, according to its International Education College, and teaches clinical medicine in English and Chinese alongside traditional Chinese medicine, stomatology and pharmacy.',
                'requirements' => [
                    'Non-Chinese citizen in good health; undergraduate under 25, master\'s under 35, doctoral under 40 (in principle)',
                    'High-school diploma (undergraduate), bachelor\'s (master\'s) or master\'s (doctoral)',
                    'Valid HSK for Chinese-taught programs; IELTS or TOEFL for English-taught programs',
                    'Passport copy, notarized diploma and transcripts, study plan, non-criminal record (within 6 months), foreigner physical examination form, photo; two recommendation letters for postgraduates',
                    'Accommodation: four-bed international-student room CNY 2,500 per year (college fee notice of 13 Nov 2025); double and single rooms are priced higher',
                ],
                'contacts' => [['International Education College', 'iec@xjmu.edu.cn', 'Admissions']],
                'programs' => [
                    ['name' => 'Clinical Medicine (English-taught)', 'level' => 'bachelor', 'language' => 'English', 'months' => 72, 'tuition' => 30000, 'source' => $xjmuBrochure],
                    ['name' => 'Clinical Medicine (Chinese-taught)', 'level' => 'bachelor', 'language' => 'Chinese', 'months' => 72, 'tuition' => 20000, 'source' => $xjmuBrochure],
                    ['name' => 'Traditional Chinese Medicine', 'level' => 'bachelor', 'language' => 'Chinese', 'months' => 60, 'source' => $xjmuBrochure],
                    ['name' => 'Acupuncture, Moxibustion and Tuina', 'level' => 'bachelor', 'language' => 'Chinese', 'months' => 60, 'source' => $xjmuBrochure],
                    ['name' => 'Chinese-Western Integrative Medicine', 'level' => 'bachelor', 'language' => 'Chinese', 'months' => 60, 'source' => $xjmuBrochure],
                    ['name' => 'Stomatology', 'level' => 'bachelor', 'language' => 'Chinese', 'months' => 60, 'source' => $xjmuBrochure],
                    ['name' => 'Pharmacy', 'level' => 'bachelor', 'language' => 'Chinese', 'months' => 48, 'source' => $xjmuBrochure],
                ],
                'intakes' => [],
                'scholarships' => [
                    [
                        'name' => 'Chinese Government Scholarship (CGS)', 'type' => 'full',
                        'coverage' => 'Free tuition, accommodation and insurance, plus an annual stipend',
                        'description' => 'Stipend of CNY 30,000 (undergraduate), 36,000 (master\'s) or 42,000 (doctoral) per year. Listed in the university\'s 2025 international admissions brochure. XJMU has not published application dates for the current cycle.',
                        'source' => $xjmuBrochure,
                    ],
                ],
            ],
            [
                'code' => 'JLMU', 'name' => 'Jilin Medical University', 'city' => 'Jilin City',
                'address' => 'No. 5 Jilin Street, Jilin City, Jilin 132013',
                'website' => 'www.jlmu.cn', 'apply_link' => null,
                'logo' => '/logos/jlmu.png',
                'about' => 'Jilin Medical University (吉林医药学院) was founded in 1952 and is a provincial public university. Its website states that it passed the Ministry of Education undergraduate teaching evaluation in 2023 and has trained 341 international students in clinical medicine.',
                'requirements' => null,
                'programs' => [
                    ['name' => 'Clinical Medicine', 'level' => 'bachelor', 'source' => 'https://www.jlmu.cn/xxgk/xxjj.htm'],
                ],
                'intakes' => [],
                'scholarships' => [],
            ],
            [
                'code' => 'WUT', 'name' => 'Wuhan University of Technology', 'city' => 'Wuhan',
                'address' => null, 'website' => 'www.whut.edu.cn', 'apply_link' => null, 'logo' => null,
                'about' => 'Wuhan University of Technology (武汉理工大学) is located in Wuhan, Hubei. Admission dates are being confirmed with the university — please contact CAS for current information.',
                'requirements' => [
                    'Tuition per year (checked 30 Oct 2026): bachelor RMB 18,000–25,000, master RMB 23,000–38,000, doctoral RMB 30,000–35,000; non-degree RMB 8,500–17,000',
                    'International student apartment: double room RMB 8,400 per year, single room RMB 12,000 per year',
                    'Confirm exact program fees and deadlines with CAS before applying',
                ],
                'programs' => [], 'intakes' => [], 'scholarships' => [],
            ],
            [
                'code' => 'LPU', 'name' => 'Liaoning Petrochemical University', 'city' => 'Fushun',
                'address' => 'No. 1 West Section of Dandong Road, Wanghua District, Fushun, Liaoning 113001',
                'website' => 'www.lnpu.edu.cn', 'apply_link' => 'http://admission.lnpu.edu.cn/', 'logo' => '/logos/lnpu.png',
                'about' => 'Liaoning Petrochemical University (辽宁石油化工大学) is located in Fushun, Liaoning; its official site still uses the former English name Liaoning Shihua University. International students apply through its International Education College, which publishes an annual admission schedule, fees and scholarships.',
                'requirements' => [
                    'Degree programs: aged 18–35 and in good health; Chinese-language study: aged 18–65. Bachelor needs a high-school certificate; master\'s needs a bachelor\'s degree',
                    'Meet the Chinese Ministry of Education health standard for international students; good conduct',
                    'Tuition per year (university fee page): English-taught bachelor CNY 16,000; Chinese-taught bachelor 14,500; master\'s 19,000 (English or Chinese); Chinese language 12,000; foundation year 15,000',
                    'Accommodation per year: double room CNY 4,500–5,500; single room 6,000–7,000',
                    'First-year costs: application fee CNY 800; bedding 260 (optional); medical exam 310.5. Each year: insurance CNY 385; residence permit 800; living costs about CNY 800 a month',
                ],
                'contacts' => [['International Education College — Admissions Office', 'shihuadaxue2008@163.com', 'Admissions (tel. +86-24-56863926)']],
                'programs' => [],
                'intakes' => [
                    // The university publishes a recurring yearly schedule; dates below are the next occurrence of it.
                    ['name' => 'Spring 2027 intake (annual schedule: apply 1 Nov – 20 Apr)', 'opens' => '2026-11-01', 'closes' => '2027-04-20', 'status' => 'open', 'source' => 'https://gjjyxy.lnpu.edu.cn/index/lxszs/zsrc.htm'],
                    ['name' => 'Autumn 2027 intake (annual schedule: apply 1 May – 20 Oct)', 'opens' => '2027-05-01', 'closes' => '2027-10-20', 'status' => 'open', 'source' => 'https://gjjyxy.lnpu.edu.cn/index/lxszs/zsrc.htm'],
                ],
                'scholarships' => [
                    [
                        'name' => 'Chinese Government Scholarship (CSC) — master\'s', 'type' => 'full',
                        'description' => 'For master\'s applicants, applied for through the CSC online system (studyinchina.csc.edu.cn) plus notarized documents mailed to the International Education College. The university states the deadline as before 30 March each year; it does not list the award amounts on this page.',
                        'how' => 'Register and apply on the CSC system, then mail the notarized application form, highest degree, transcripts, a study plan of at least 800 words, two recommendation letters and the physical examination form.',
                        'apply' => 'http://studyinchina.csc.edu.cn', 'closes' => '2027-03-30', 'source' => 'https://gjjyxy.lnpu.edu.cn/index/lhlx/zgzfjxj.htm',
                    ],
                    [
                        'name' => 'LNPU Scholarship for international students', 'type' => 'partial',
                        'description' => 'Awarded once a school year to self-funded international students who are already enrolled: first, second and third-class scholarships plus awards for outstanding student leaders and activity participants. Amounts are not published.',
                        'eligibility' => 'Undergraduates in years 2–4 and master\'s students in years 2–3, self-funded, with no disciplinary record. Apply when the college issues its notice.',
                        'source' => 'https://gjjyxy.lnpu.edu.cn/index/lhlx/lshjxj.htm',
                    ],
                ],
            ],
        ];
    }
}

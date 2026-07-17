<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\University;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Demo catalog: real Chinese universities CAS works with, their programs,
 * intakes, scholarships, contacts and commission agreements. Idempotent —
 * keyed on university code / child natural keys.
 */
class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $cn = Country::where('iso2', 'CN')->first();

        $content = $this->universityContent();
        $scholarshipContent = $this->scholarshipContent();

        foreach ($this->catalog() as $data) {
            $c = $content[$data['code']] ?? [];

            $university = University::updateOrCreate(
                ['code' => $data['code']],
                [
                    'name' => $data['name'],
                    'slug' => Str::slug($data['name']),
                    'country_id' => $cn?->id,
                    'city' => $data['city'],
                    'website' => $data['website'] ?? null,
                    'status' => 'active',
                    'about' => $c['about'] ?? null,
                    'requirements' => $c['requirements'] ?? null,
                    'nearest_airport' => $c['nearest_airport'] ?? null,
                    'moe_listed' => $c['moe_listed'] ?? false,
                    'apply_link' => $c['apply_link'] ?? null,
                    'representative_professor' => $c['professor'] ?? null,
                ],
            );

            foreach ($data['contacts'] ?? [] as $contact) {
                $university->contacts()->firstOrCreate(
                    ['name' => $contact[0]],
                    ['email' => $contact[1], 'role' => $contact[2]],
                );
            }

            $programs = [];
            foreach ($data['programs'] as $program) {
                [$name, $level, $months, $fee] = $program;
                $programs[$name] = $university->programs()->updateOrCreate(
                    ['name' => $name, 'level' => $level],
                    [
                        'teaching_language' => str_contains($name, 'Chinese Language') ? 'Chinese' : 'English',
                        'duration_months' => $months,
                        'tuition_fee' => $fee,
                        'currency' => 'CNY',
                        'requirements' => ['documents' => ['passport', 'transcript'], 'min_age' => 18],
                        'status' => 'active',
                    ],
                );
            }

            foreach (['September 2026' => ['2026-09-01', '2026-07-15'], 'March 2027' => ['2027-03-01', '2027-01-10']] as $intakeName => [$start, $deadline]) {
                $university->intakes()->firstOrCreate(
                    ['name' => $intakeName, 'program_id' => null],
                    ['start_date' => $start, 'application_deadline' => $deadline, 'seats' => 100, 'status' => 'open'],
                );
            }

            foreach ($data['scholarships'] ?? [] as $scholarship) {
                [$name, $type, $coverage] = $scholarship;
                $sc = $scholarshipContent[$name] ?? [];
                $university->scholarships()->updateOrCreate(
                    ['name' => $name],
                    [
                        'slug' => Str::slug($name),
                        'type' => $type,
                        'coverage' => $coverage,
                        'amount' => $sc['amount'] ?? null,
                        'currency' => isset($sc['amount']) ? 'CNY' : null,
                        'description' => $sc['description'] ?? null,
                        'eligibility' => $sc['eligibility'] ?? null,
                        'how_to_apply' => $sc['how_to_apply'] ?? null,
                        'criteria' => ['min_gpa' => 3.0],
                        'deadline' => '2026-06-30',
                        'status' => 'active',
                    ],
                );
            }

            foreach ($data['agreements'] as $agreement) {
                [$type, $value, $currency, $programName] = $agreement;
                $university->agreements()->firstOrCreate(
                    [
                        'commission_type' => $type,
                        'program_id' => $programName ? ($programs[$programName]->id ?? null) : null,
                    ],
                    [
                        'commission_value' => $value,
                        'currency' => $currency,
                        'eligibility_trigger' => 'arrival_first_year_paid',
                        'valid_from' => '2026-01-01',
                        'valid_to' => '2027-12-31',
                    ],
                );
            }
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function catalog(): array
    {
        return [
            [
                'name' => 'Jilin Medical University', 'code' => 'JLMU', 'city' => 'Jilin City',
                'website' => 'www.jlmu.cn',
                'contacts' => [['Ms. Zhang Min', 'admissions@jlmu.cn', 'International Office']],
                'programs' => [
                    ['MBBS', 'bachelor', 72, 32000],
                    ['Nursing', 'bachelor', 48, 24000],
                ],
                'scholarships' => [['First-Year Merit Award', 'partial', '50% tuition']],
                'agreements' => [
                    ['fixed', 8000, 'CNY', 'MBBS'],
                    ['percent', 12, null, null],
                ],
            ],
            [
                'name' => 'Xinjiang Medical University', 'code' => 'XJMU', 'city' => 'Urumqi',
                'website' => 'www.xjmu.edu.cn',
                'contacts' => [['Mr. Ali Turgun', 'intl@xjmu.edu.cn', 'Admissions Officer']],
                'programs' => [
                    ['MBBS', 'bachelor', 72, 30000],
                    ['Traditional Chinese Medicine', 'bachelor', 60, 26000],
                ],
                'scholarships' => [['Belt & Road Scholarship', 'full', 'Full tuition']],
                // Program-specific MBBS rate + a university-wide fallback so
                // every program resolves an agreement.
                'agreements' => [['fixed', 9000, 'CNY', 'MBBS'], ['percent', 11, null, null]],
            ],
            [
                'name' => 'Dalian Medical University', 'code' => 'DMU', 'city' => 'Dalian',
                'website' => 'www.dmu.edu.cn',
                'contacts' => [['Ms. Wang Fang', 'fao@dmu.edu.cn', 'International Office']],
                'programs' => [
                    ['MBBS', 'bachelor', 72, 42000],
                    ['Stomatology (BDS)', 'bachelor', 60, 38000],
                ],
                'scholarships' => [['Presidential Scholarship', 'merit', 'Tuition + hostel']],
                'agreements' => [['percent', 15, null, null]],
            ],
            [
                'name' => 'Beijing Institute of Technology', 'code' => 'BIT', 'city' => 'Beijing',
                'website' => 'www.bit.edu.cn',
                'contacts' => [['Dr. Chen Hao', 'isc@bit.edu.cn', 'International Student Center']],
                'programs' => [
                    ['Computer Science and Technology', 'bachelor', 48, 30000],
                    ['Mechanical Engineering', 'master', 30, 34000],
                ],
                'scholarships' => [['Chinese Government Scholarship (CSC)', 'full', 'Full tuition + stipend']],
                'agreements' => [['percent', 10, null, null]],
            ],
            [
                'name' => 'Zhejiang University of Science and Technology', 'code' => 'ZUST', 'city' => 'Hangzhou',
                'website' => 'www.zust.edu.cn',
                'programs' => [
                    ['Civil Engineering', 'bachelor', 48, 22000],
                    ['International Business', 'bachelor', 48, 20000],
                ],
                'scholarships' => [['Provincial Government Scholarship', 'partial', '20,000 CNY/year']],
                'agreements' => [['fixed', 6000, 'CNY', null]],
            ],
            [
                'name' => 'Nanjing University of Information Science and Technology', 'code' => 'NUIST', 'city' => 'Nanjing',
                'website' => 'www.nuist.edu.cn',
                'programs' => [
                    ['Computer Science and Technology', 'bachelor', 48, 24000],
                    ['Chinese Language Program', 'bachelor', 12, 16000],
                ],
                'agreements' => [['percent', 14, null, null]],
            ],
            [
                'name' => 'Wuhan University of Technology', 'code' => 'WUT', 'city' => 'Wuhan',
                'website' => 'www.whut.edu.cn',
                'programs' => [
                    ['Civil Engineering', 'bachelor', 48, 26000],
                    ['Automotive Engineering', 'master', 36, 32000],
                ],
                'scholarships' => [['WUT Excellence Scholarship', 'merit', '30% tuition']],
                'agreements' => [['percent', 12, null, null]],
            ],
            [
                'name' => 'Liaoning Petrochemical University', 'code' => 'LPU', 'city' => 'Fushun',
                'website' => 'www.lnpu.edu.cn',
                'programs' => [
                    ['Petroleum Engineering', 'bachelor', 48, 21000],
                    ['Chinese Language Program', 'bachelor', 12, 14000],
                ],
                'agreements' => [['fixed', 5000, 'CNY', null]],
            ],
        ];
    }

    /**
     * Website content per university (ADR-0005 fields), keyed by code.
     *
     * @return array<string, array<string, mixed>>
     */
    private function universityContent(): array
    {
        return [
            'JLMU' => [
                'about' => 'Jilin Medical University is a public medical university in Jilin City with a strong reputation for its English-taught MBBS. It welcomes international students from across Asia and Africa and is recognised by the WHO and China\'s Ministry of Education.',
                'requirements' => ['High school diploma with science subjects', 'Minimum 60% in Physics, Chemistry and Biology', 'IELTS 5.5 or equivalent (English-taught tracks)', 'Aged 18–25 at enrolment', 'Medical fitness certificate'],
                'nearest_airport' => 'Changchun Longjia International Airport (CGQ)',
                'moe_listed' => true,
                'apply_link' => 'https://apply.jlmu.cn',
                'professor' => ['name' => 'Prof. Zhang Wei', 'title' => 'Dean of International Education'],
            ],
            'XJMU' => [
                'about' => 'Xinjiang Medical University in Urumqi is a leading medical institution in north-west China, offering English-medium MBBS and Traditional Chinese Medicine to a diverse international community.',
                'requirements' => ['High school diploma', 'Strong grades in Biology and Chemistry', 'IELTS 5.5 (English-taught)', 'Aged 18–25', 'Physical examination record'],
                'nearest_airport' => 'Ürümqi Diwopu International Airport (URC)',
                'moe_listed' => true,
                'apply_link' => 'https://apply.xjmu.edu.cn',
                'professor' => ['name' => 'Prof. Ma Jun', 'title' => 'Director, International Students Office'],
            ],
            'DMU' => [
                'about' => 'Dalian Medical University is a prestigious coastal university known for its MBBS and Stomatology programs and modern teaching hospitals in the port city of Dalian.',
                'requirements' => ['High school diploma', '65%+ in science subjects', 'IELTS 6.0 (English-taught)', 'Aged 18–25', 'Medical fitness certificate'],
                'nearest_airport' => 'Dalian Zhoushuizi International Airport (DLC)',
                'moe_listed' => true,
                'apply_link' => 'https://apply.dmu.edu.cn',
                'professor' => ['name' => 'Prof. Li Na', 'title' => 'Dean of International Medical Education'],
            ],
            'BIT' => [
                'about' => 'Beijing Institute of Technology is a top-tier "985" and "211" university renowned for engineering and technology, offering English-taught bachelor\'s and master\'s degrees in the heart of Beijing.',
                'requirements' => ['High school diploma (bachelor) or bachelor degree (master)', 'Strong mathematics background', 'IELTS 6.0 / TOEFL 80', 'Motivation letter', 'Two references (postgraduate)'],
                'nearest_airport' => 'Beijing Capital International Airport (PEK)',
                'moe_listed' => true,
                'apply_link' => 'https://admission.bit.edu.cn',
                'professor' => ['name' => 'Dr. Chen Hao', 'title' => 'International Student Center'],
            ],
            'ZUST' => [
                'about' => 'Zhejiang University of Science and Technology in scenic Hangzhou offers practical, industry-focused engineering and business programs with a growing international community.',
                'requirements' => ['High school diploma', 'IELTS 5.5 or HSK 4', 'Aged 18–30', 'Statement of purpose'],
                'nearest_airport' => 'Hangzhou Xiaoshan International Airport (HGH)',
                'moe_listed' => false,
                'apply_link' => 'https://iso.zust.edu.cn/apply',
                'professor' => ['name' => 'Prof. Wu Ling', 'title' => 'International College'],
            ],
            'NUIST' => [
                'about' => 'Nanjing University of Information Science and Technology is a national leader in atmospheric sciences and IT, offering English-taught degrees and a well-established Chinese Language Program.',
                'requirements' => ['High school diploma', 'IELTS 5.5 or HSK 4', 'Aged 18–30', 'Academic transcripts'],
                'nearest_airport' => 'Nanjing Lukou International Airport (NKG)',
                'moe_listed' => false,
                'apply_link' => 'https://sie.nuist.edu.cn/apply',
                'professor' => ['name' => 'Prof. Sun Qiang', 'title' => 'School of International Education'],
            ],
            'WUT' => [
                'about' => 'Wuhan University of Technology is a "211" university with strengths in materials, civil and automotive engineering, hosting thousands of international students in central China.',
                'requirements' => ['High school diploma (bachelor) or bachelor degree (master)', 'IELTS 6.0', 'Aged 18–30', 'Study plan'],
                'nearest_airport' => 'Wuhan Tianhe International Airport (WUH)',
                'moe_listed' => false,
                'apply_link' => 'https://sie.whut.edu.cn/apply',
                'professor' => ['name' => 'Prof. Zhao Lei', 'title' => 'School of International Education'],
            ],
            'LPU' => [
                'about' => 'Liaoning Petrochemical University specialises in petroleum, chemical and process engineering, with affordable tuition and a supportive environment for international students in Fushun.',
                'requirements' => ['High school diploma', 'IELTS 5.5 or HSK 3', 'Aged 18–30', 'Passport copy'],
                'nearest_airport' => 'Shenyang Taoxian International Airport (SHE)',
                'moe_listed' => false,
                'apply_link' => 'https://en.lnpu.edu.cn/apply',
                'professor' => ['name' => 'Prof. Han Mei', 'title' => 'International Education College'],
            ],
        ];
    }

    /**
     * Scholarship copy keyed by name (amount in CNY where concrete).
     *
     * @return array<string, array<string, mixed>>
     */
    private function scholarshipContent(): array
    {
        return [
            'First-Year Merit Award' => [
                'amount' => 16000,
                'description' => 'A first-year award recognising strong academic entry results for MBBS and Nursing applicants.',
                'eligibility' => 'Awarded on admission grades; no separate application required.',
                'how_to_apply' => 'Automatically considered at admission — your CAS counselor confirms eligibility.',
            ],
            'Belt & Road Scholarship' => [
                'amount' => 30000,
                'description' => 'Full-tuition scholarship for students from Belt & Road partner countries.',
                'eligibility' => 'Nationals of Belt & Road countries with strong academic records.',
                'how_to_apply' => 'Apply through CAS with your admission letter and passport.',
            ],
            'Presidential Scholarship' => [
                'amount' => 42000,
                'description' => 'Covers tuition and on-campus accommodation for outstanding applicants.',
                'eligibility' => 'Top-decile academic performance; an interview may be required.',
                'how_to_apply' => 'Nominated by the admissions committee; CAS submits supporting documents.',
            ],
            'Chinese Government Scholarship (CSC)' => [
                'description' => 'Full scholarship (tuition, accommodation and a monthly stipend) funded by the Chinese government.',
                'eligibility' => 'High-achieving international applicants; competitive national selection.',
                'how_to_apply' => 'Apply via the CSC portal with CAS guidance before the annual deadline.',
            ],
            'Provincial Government Scholarship' => [
                'amount' => 20000,
                'description' => 'A provincial award of 20,000 CNY per year toward tuition.',
                'eligibility' => 'Enrolled degree students in good standing.',
                'how_to_apply' => 'Apply each year through the international office.',
            ],
            'WUT Excellence Scholarship' => [
                'description' => 'Merit award covering 30% of tuition for high performers.',
                'eligibility' => 'Maintain a GPA above 3.3.',
                'how_to_apply' => 'Apply after first-semester results are published.',
            ],
        ];
    }
}

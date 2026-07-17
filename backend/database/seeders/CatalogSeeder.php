<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\University;
use Illuminate\Database\Seeder;

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

        foreach ($this->catalog() as $data) {
            $university = University::updateOrCreate(
                ['code' => $data['code']],
                [
                    'name' => $data['name'],
                    'country_id' => $cn?->id,
                    'city' => $data['city'],
                    'website' => $data['website'] ?? null,
                    'status' => 'active',
                ],
            );

            foreach ($data['contacts'] ?? [] as $contact) {
                $university->contacts()->firstOrCreate(
                    ['name' => $contact[0]],
                    ['email' => $contact[1], 'role' => $contact[2]],
                );
            }

            $courses = [];
            foreach ($data['courses'] as $course) {
                [$name, $level, $months, $fee] = $course;
                $courses[$name] = $university->courses()->firstOrCreate(
                    ['name' => $name, 'level' => $level],
                    [
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
                    ['name' => $intakeName, 'course_id' => null],
                    ['start_date' => $start, 'application_deadline' => $deadline, 'seats' => 100, 'status' => 'open'],
                );
            }

            foreach ($data['scholarships'] ?? [] as $scholarship) {
                [$name, $type, $coverage] = $scholarship;
                $university->scholarships()->firstOrCreate(
                    ['name' => $name],
                    ['type' => $type, 'coverage' => $coverage, 'criteria' => ['min_gpa' => 3.0], 'deadline' => '2026-06-30', 'status' => 'active'],
                );
            }

            foreach ($data['agreements'] as $agreement) {
                [$type, $value, $currency, $courseName] = $agreement;
                $university->agreements()->firstOrCreate(
                    [
                        'commission_type' => $type,
                        'course_id' => $courseName ? ($courses[$courseName]->id ?? null) : null,
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
                'courses' => [
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
                'courses' => [
                    ['MBBS', 'bachelor', 72, 30000],
                    ['Traditional Chinese Medicine', 'bachelor', 60, 26000],
                ],
                'scholarships' => [['Belt & Road Scholarship', 'full', 'Full tuition']],
                'agreements' => [['fixed', 9000, 'CNY', 'MBBS']],
            ],
            [
                'name' => 'Dalian Medical University', 'code' => 'DMU', 'city' => 'Dalian',
                'website' => 'www.dmu.edu.cn',
                'contacts' => [['Ms. Wang Fang', 'fao@dmu.edu.cn', 'International Office']],
                'courses' => [
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
                'courses' => [
                    ['Computer Science and Technology', 'bachelor', 48, 30000],
                    ['Mechanical Engineering', 'master', 30, 34000],
                ],
                'scholarships' => [['Chinese Government Scholarship (CSC)', 'full', 'Full tuition + stipend']],
                'agreements' => [['percent', 10, null, null]],
            ],
            [
                'name' => 'Zhejiang University of Science and Technology', 'code' => 'ZUST', 'city' => 'Hangzhou',
                'website' => 'www.zust.edu.cn',
                'courses' => [
                    ['Civil Engineering', 'bachelor', 48, 22000],
                    ['International Business', 'bachelor', 48, 20000],
                ],
                'scholarships' => [['Provincial Government Scholarship', 'partial', '20,000 CNY/year']],
                'agreements' => [['fixed', 6000, 'CNY', null]],
            ],
            [
                'name' => 'Nanjing University of Information Science and Technology', 'code' => 'NUIST', 'city' => 'Nanjing',
                'website' => 'www.nuist.edu.cn',
                'courses' => [
                    ['Computer Science and Technology', 'bachelor', 48, 24000],
                    ['Chinese Language Program', 'bachelor', 12, 16000],
                ],
                'agreements' => [['percent', 14, null, null]],
            ],
            [
                'name' => 'Wuhan University of Technology', 'code' => 'WUT', 'city' => 'Wuhan',
                'website' => 'www.whut.edu.cn',
                'courses' => [
                    ['Civil Engineering', 'bachelor', 48, 26000],
                    ['Automotive Engineering', 'master', 36, 32000],
                ],
                'scholarships' => [['WUT Excellence Scholarship', 'merit', '30% tuition']],
                'agreements' => [['percent', 12, null, null]],
            ],
            [
                'name' => 'Liaoning Petrochemical University', 'code' => 'LPU', 'city' => 'Fushun',
                'website' => 'www.lnpu.edu.cn',
                'courses' => [
                    ['Petroleum Engineering', 'bachelor', 48, 21000],
                    ['Chinese Language Program', 'bachelor', 12, 14000],
                ],
                'agreements' => [['fixed', 5000, 'CNY', null]],
            ],
        ];
    }
}

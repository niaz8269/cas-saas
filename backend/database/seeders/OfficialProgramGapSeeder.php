<?php

namespace Database\Seeders;

use App\Models\Program;
use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Programs for universities whose imported catalog had none, taken from each
 * university's own admissions page or catalogue (source_url) and written in
 * CAS's own words. A value the official page does not state is left empty
 * (the fee then shows as on request) rather than guessed.
 * Idempotent: keyed on university + program name.
 */
class OfficialProgramGapSeeder extends Seeder
{
    private const SHANTOU_MASTER_SOURCE = 'https://intlsumc.med.stu.edu.cn/53/list_53_1.html';

    private const YANTAI_SOURCE = 'https://engsie.ytu.edu.cn/eng2027.pdf';

    private const YANBIAN_SOURCE = 'https://liuxue.ybu.edu.cn/zsxx/xls/bks.htm';

    private const ZJGSU_SOURCE = 'https://sie.zjgsu.edu.cn/gjen/_t75/2128/listm.htm';

    /** @return list<array<string, mixed>> */
    private function rows(): array
    {
        $rows = [
            ['university' => 'Shanghai University of Traditional Chinese Medicine', 'name' => 'Traditional Chinese Medicine (Acupuncture)', 'level' => 'bachelor', 'teaching_language' => 'English', 'duration_months' => 60, 'tuition_fee' => 42000, 'source_url' => 'https://iec.shutcm.edu.cn/en/2024/1113/c610a163304/page.htm'],
            ['university' => 'Renmin University of China', 'name' => 'Chinese Philosophy, Religion and Culture', 'level' => 'master', 'teaching_language' => 'English', 'duration_months' => 24, 'tuition_fee' => 40000, 'source_url' => 'http://phi.ruc.edu.cn/Home/International/InternationalStudentsProgram/1a5ee737329546eabda1056df98ce88f.htm'],
            ['university' => 'Shantou University Medical College', 'name' => 'Clinical Medicine', 'level' => 'bachelor', 'teaching_language' => null, 'duration_months' => null, 'tuition_fee' => null, 'source_url' => 'https://www.med.stu.edu.cn/63/list_63_1.html'],
            ['university' => 'Shantou University Medical College', 'name' => 'Ophthalmic Optometry', 'level' => 'bachelor', 'teaching_language' => null, 'duration_months' => null, 'tuition_fee' => null, 'source_url' => 'https://www.med.stu.edu.cn/63/list_63_1.html'],
        ];

        // Shantou's 2027 international master's catalogue: 18 majors, three years, taught in Chinese or English.
        foreach (['Neurobiology', 'Cell Biology', 'Biochemistry and Molecular Biology', 'Immunology', 'Pathology and Pathophysiology', 'Oncology', 'Clinical Laboratory Diagnostics', 'Medical Imaging and Nuclear Medicine', 'Internal Medicine', 'Surgery', 'Pediatrics', 'Ophthalmology', 'Psychiatry and Mental Health', 'Medicinal Chemistry', 'Pharmacology', 'Obstetrics and Gynecology', 'Basic Medicine', 'Public Health and Preventive Medicine'] as $major) {
            $rows[] = ['university' => 'Shantou University Medical College', 'name' => $major, 'level' => 'master', 'teaching_language' => 'Chinese or English', 'duration_months' => 36, 'tuition_fee' => null, 'source_url' => self::SHANTOU_MASTER_SOURCE];
        }

        // Yantai's 2027 prospectus: Chinese-taught; fees are by liberal-arts / science field.
        foreach ([['Chinese Language', 12400, 48], ['Business Administration', 12400, null], ['Law', 12400, null], ['Computer Science and Technology', 13400, null], ['Pharmacy', 13400, null], ['Civil Engineering', 13400, null]] as [$major, $fee, $months]) {
            $rows[] = ['university' => 'Yantai University', 'name' => $major, 'level' => 'bachelor', 'teaching_language' => 'Chinese', 'duration_months' => $months, 'tuition_fee' => $fee, 'source_url' => self::YANTAI_SOURCE];
        }
        foreach ([['Business Administration', 21000], ['Computer Science and Technology', 25000]] as [$major, $fee]) {
            $rows[] = ['university' => 'Yantai University', 'name' => $major, 'level' => 'master', 'teaching_language' => 'Chinese', 'duration_months' => null, 'tuition_fee' => $fee, 'source_url' => self::YANTAI_SOURCE];
        }

        // Yanbian's undergraduate catalogue (an image on its international-admissions site): Chinese-taught,
        // four years (five for medicine and veterinary). Fees by field: medicine 26,000, sports and arts 27,000,
        // agriculture 22,000, everything else 18,000. Nursing and pharmacy are not assigned a field there, so no fee.
        $yanbian = [
            18000 => ['English', 'Japanese', 'Russian', 'Korean', 'Law', 'International Politics', 'Sociology', 'History', 'Educational Technology', 'Preschool Education', 'Primary Education', 'Psychology', 'Chinese Language and Literature', 'Chinese Language', 'International Chinese Language Education', 'Journalism', 'Mathematics and Applied Mathematics', 'Physics', 'Statistics', 'Chemistry', 'Applied Chemistry', 'Electronic Information Engineering', 'Communication Engineering', 'Artificial Intelligence', 'Civil Engineering', 'Computer Science and Technology', 'Biotechnology', 'Food Science and Engineering', 'Economics', 'International Economics and Trade', 'Business Administration', 'Accounting', 'Tourism Management', 'Geographical Science', 'Environmental Science'],
            26000 => ['Clinical Medicine', 'Anesthesiology', 'Stomatology', 'Preventive Medicine', 'Traditional Chinese Medicine'],
            27000 => ['Physical Education', 'Sports Training', 'Music Performance', 'Musicology', 'Dance Performance', 'Fine Arts', 'Environmental Design', 'Visual Communication Design'],
            22000 => ['Agronomy', 'Horticulture', 'Animal Science'],
            0 => ['Nursing', 'Pharmacy'],
        ];
        $fiveYear = ['Clinical Medicine', 'Anesthesiology', 'Stomatology', 'Preventive Medicine', 'Traditional Chinese Medicine'];
        foreach ($yanbian as $fee => $majors) {
            foreach ($majors as $major) {
                $rows[] = ['university' => 'Yanbian University', 'name' => $major, 'level' => 'bachelor', 'teaching_language' => 'Chinese', 'duration_months' => in_array($major, $fiveYear, true) ? 60 : 48, 'tuition_fee' => $fee ?: null, 'source_url' => self::YANBIAN_SOURCE];
            }
        }

        // Zhejiang Gongshang's 2026 English-taught undergraduate catalogue: four years, 18,000 CNY a year.
        foreach (['International Business Administration', 'International Law', 'Accounting', 'International Hospitality Management', 'E-commerce', 'International Finance'] as $major) {
            $rows[] = ['university' => 'Zhejiang Gongshang University', 'name' => $major, 'level' => 'bachelor', 'teaching_language' => 'English', 'duration_months' => 48, 'tuition_fee' => 18000, 'source_url' => self::ZJGSU_SOURCE];
        }

        return $rows;
    }

    public function run(): void
    {
        $added = 0;

        foreach ($this->rows() as $row) {
            $university = University::query()->where('name', $row['university'])->first();
            if (! $university) {
                continue;
            }

            $program = Program::query()->updateOrCreate(
                ['university_id' => $university->id, 'name' => $row['name'], 'level' => $row['level']],
                [
                    'teaching_language' => $row['teaching_language'],
                    'duration_months' => $row['duration_months'],
                    'tuition_fee' => $row['tuition_fee'],
                    'currency' => 'CNY',
                    'status' => 'active',
                    'source_url' => $row['source_url'],
                    'verified_on' => now()->toDateString(),
                    'visibility' => ['tuition_fee' => ['public', 'student', 'agent', 'counselor']],
                ],
            );

            $added += $program->wasRecentlyCreated ? 1 : 0;
        }

        $this->command?->info("Official program gaps filled: {$added}.");
    }
}

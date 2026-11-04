<?php

namespace Database\Seeders;

use App\Models\Program;
use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Programs for universities whose imported catalog had none, taken from each
 * university's own international-admissions page (source_url) and written in
 * CAS's own words. Only programs whose language, length and fee the official
 * page states are listed; the others stay out until a page confirms them.
 * Idempotent: keyed on university + program name.
 */
class OfficialProgramGapSeeder extends Seeder
{
    private const ROWS = [
        [
            'university' => 'Shanghai University of Traditional Chinese Medicine',
            'name' => 'Traditional Chinese Medicine (Acupuncture)',
            'level' => 'bachelor',
            'teaching_language' => 'English',
            'duration_months' => 60,
            'tuition_fee' => 42000,
            'source_url' => 'https://iec.shutcm.edu.cn/en/2024/1113/c610a163304/page.htm',
        ],
        [
            'university' => 'Renmin University of China',
            'name' => 'Chinese Philosophy, Religion and Culture',
            'level' => 'master',
            'teaching_language' => 'English',
            'duration_months' => 24,
            'tuition_fee' => 40000,
            'source_url' => 'http://phi.ruc.edu.cn/Home/International/InternationalStudentsProgram/1a5ee737329546eabda1056df98ce88f.htm',
        ],
    ];

    public function run(): void
    {
        $added = 0;

        foreach (self::ROWS as $row) {
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

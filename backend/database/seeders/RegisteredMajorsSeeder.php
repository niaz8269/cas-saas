<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Majors each institution has registered with the Ministry of Education, taken
 * from the Ministry's published results of its yearly undergraduate major
 * filings (2018, 2020 to 2024), its approvals of new vocational majors
 * (2022 to 2026), and the 2026 higher-vocational enrolment filings on its public
 * major platform (zyyxzy.moe.edu.cn). They are what the Ministry lists for the school, not an
 * international-admissions offer, so they are flagged `registry_only`: the public
 * site shows them on the university's page with a note, and counselors confirm
 * language, fees and dates for international applicants.
 *
 * Source: database/data/registered_majors.json. Idempotent; never touches a
 * program that already has confirmed international details.
 */
class RegisteredMajorsSeeder extends Seeder
{
    private const SOURCE = 'https://www.moe.gov.cn/jyb_xxgk/xxgk/neirong/fenlei/sxml_gdjy/gdjy_bkzysz/';

    private const PUBLIC = ['public', 'student', 'agent', 'counselor'];

    public function run(): void
    {
        $path = database_path('data/registered_majors.json');
        if (! is_file($path)) {
            return;
        }

        $byZh = University::withTrashed()->whereNotNull('name_zh')->pluck('id', 'name_zh');
        $now = now();
        $verified = $now->toDateString();
        $added = 0;

        foreach (json_decode(file_get_contents($path), true)['majors'] ?? [] as $school => $majors) {
            $universityId = $byZh[$school] ?? null;
            if (! $universityId) {
                continue;
            }

            $have = DB::table('programs')->where('university_id', $universityId)->whereNull('deleted_at')
                ->get(['name', 'level'])
                ->mapWithKeys(fn ($p) => [Str::lower($p->name).'|'.$p->level => true]);

            $batch = [];
            foreach ($majors as $m) {
                $key = Str::lower($m['en']).'|'.$m['level'];
                if ($have->has($key)) {
                    continue;
                }
                $have->put($key, true);

                $batch[] = [
                    'university_id' => $universityId,
                    'name' => Str::limit($m['en'], 190, ''),
                    'name_zh' => Str::limit($m['zh'], 190, ''),
                    'level' => $m['level'],
                    'csc_listed' => false,
                    'registry_only' => true,
                    'teaching_language' => null,
                    'duration_months' => $m['months'] ?? null,
                    'tuition_fee' => null,
                    'currency' => 'CNY',
                    'source_url' => self::SOURCE,
                    'verified_on' => $verified,
                    'visibility' => json_encode(['tuition_fee' => self::PUBLIC]),
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            foreach (array_chunk($batch, 500) as $chunk) {
                DB::table('programs')->insert($chunk);
            }
            $added += count($batch);
        }

        $this->command?->info("Registered majors added: {$added}.");
    }
}

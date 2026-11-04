<?php

namespace Database\Seeders;

use App\Models\Program;
use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Every university on the Ministry of Education's list is approved to enrol
 * English-taught MBBS (clinical medicine) students, so it must offer that program.
 * Some had no English MBBS row in the imported catalog; this adds a standard one,
 * sourced to the Ministry's list, without a fee (the fee shows as "on request" until a source is found).
 * Idempotent: universities that already have an English MBBS program are skipped.
 */
class MbbsProgramGapSeeder extends Seeder
{
    public const NAME = 'Clinical Medicine (MBBS)';

    public function run(): void
    {
        $added = 0;

        University::query()->where('moe_listed', true)->get(['id', 'name', 'moe_mbbs_source_url'])->each(function (University $u) use (&$added) {
            $has = Program::query()
                ->where('university_id', $u->id)
                ->where('level', 'bachelor')
                ->where('teaching_language', 'like', '%English%')
                ->where(fn ($q) => $q->where('name', 'like', '%MBBS%')->orWhere('name', 'like', '%Clinical Medicine%'))
                ->exists();

            if ($has) {
                return;
            }

            Program::create([
                'university_id' => $u->id,
                'name' => self::NAME,
                'name_zh' => '临床医学（英语授课）',
                'level' => 'bachelor',
                'teaching_language' => 'English',
                'duration_months' => 72,
                'currency' => 'CNY',
                'status' => 'active',
                'source_url' => $u->moe_mbbs_source_url,
                'verified_on' => now()->toDateString(),
                'visibility' => ['tuition_fee' => ['public', 'student', 'agent', 'counselor']],
            ]);
            $added++;
        });

        $this->command?->info("MBBS program gaps filled: {$added}.");
    }
}

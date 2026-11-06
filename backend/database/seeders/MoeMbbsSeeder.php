<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Marks the universities on the Ministry of Education's annual list of
 * institutions approved to enrol English-taught MBBS (clinical medicine)
 * students. That list is what the public site means by "MoE-listed".
 *
 * Source: database/data/moe_mbbs_2026_27.json (MoE letter 教外照〔2026〕65号).
 * Universities are matched by Chinese name. Idempotent; resets every other
 * university to not listed so the flag always mirrors the current list.
 */
class MoeMbbsSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/moe_mbbs_2026_27.json');
        if (! is_file($path)) {
            $this->command?->warn('moe_mbbs_2026_27.json not found; skipping.');

            return;
        }

        $list = json_decode(file_get_contents($path), true);
        $names = array_column($list['universities'], 0);

        University::query()->update(['moe_listed' => false, 'moe_mbbs_year' => null, 'moe_mbbs_source_url' => null]);

        $matched = University::whereIn('name_zh', $names)->update([
            'moe_listed' => true,
            'moe_mbbs_year' => $list['academic_year'],
            'moe_mbbs_source_url' => $list['source_url'],
        ]);

        $this->command?->info("MoE MBBS list {$list['academic_year']}: {$matched} of ".count($names).' universities marked.');
    }
}

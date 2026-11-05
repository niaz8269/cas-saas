<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Every undergraduate-level university in each province, from the Ministry of
 * Education's national list of regular higher-education institutions
 * (as of 17 June 2026). The catalog built from the CSC study-in-China list only
 * holds universities that already publish programs for international students;
 * this adds the rest so each province is complete. They carry the official name,
 * Chinese name, city, province and MoE school code, and no programs: counselors
 * confirm availability for international applicants.
 *
 * Source: database/data/moe_institutions.json. Idempotent: skips anything whose
 * Chinese name or MoE code is already in the catalog.
 */
class MoeInstitutionsSeeder extends Seeder
{
    private const PUBLIC = ['public', 'student', 'agent', 'counselor'];

    public function run(): void
    {
        $path = database_path('data/moe_institutions.json');
        if (! is_file($path)) {
            return;
        }

        $cn = Country::where('iso2', 'CN')->first();
        $haveZh = University::withTrashed()->whereNotNull('name_zh')->pluck('name_zh')->flip();
        $haveCode = University::withTrashed()->pluck('code')->flip();
        $haveName = University::withTrashed()->pluck('name')->map(fn ($n) => mb_strtolower($n))->flip();
        $added = 0;

        foreach (json_decode(file_get_contents($path), true)['institutions'] ?? [] as $row) {
            $nameKey = mb_strtolower($row['name']);
            if ($haveZh->has($row['name_zh']) || $haveCode->has($row['code']) || $haveName->has($nameKey)) {
                continue;
            }

            University::create([
                'name' => $row['name'],
                'name_zh' => $row['name_zh'],
                'code' => $row['code'],
                'country_id' => $cn?->id,
                'city' => $row['city'],
                'province' => $row['province'],
                'website' => $row['website'] ?? null,
                'institution_type' => $row['type'] ?? null,
                'moe_listed' => false,
                'visibility' => ['deadlines' => self::PUBLIC],
                'status' => 'active',
            ]);

            $haveZh->put($row['name_zh'], true);
            $haveCode->put($row['code'], true);
            $haveName->put($nameKey, true);
            $added++;
        }

        $this->command?->info("MoE-listed universities added: {$added}.");
    }
}

<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\University;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Universities that enrol international students but are not on the CSC
 * study-in-China list the main catalog is built from. Each one was added only
 * after its own admissions page was read; programs, fees and dates are the ones
 * that page states, and anything it does not state is left empty.
 *
 * Source: database/data/additional_universities.json. Idempotent: keyed on the
 * university name and, for programs and intakes, on their names.
 */
class AdditionalUniversitiesSeeder extends Seeder
{
    private const PUBLIC = ['public', 'student', 'agent', 'counselor'];

    private const LEVELS = ['bachelor', 'master', 'phd', 'non_degree'];

    public function run(): void
    {
        $path = database_path('data/additional_universities.json');
        if (! is_file($path)) {
            return;
        }

        $cn = Country::where('iso2', 'CN')->first();
        $codes = University::withTrashed()->pluck('code')->flip();
        $added = 0;

        foreach (json_decode(file_get_contents($path), true)['universities'] ?? [] as $row) {
            $uni = University::withTrashed()->where('name', $row['name'])->first();

            if (! $uni) {
                $uni = University::create([
                    'name' => $row['name'],
                    'name_zh' => $row['name_zh'] ?? null,
                    'code' => $this->code($row['name'], $codes),
                    'country_id' => $cn?->id,
                    'city' => $row['city'] ?? null,
                    'province' => $row['province'] ?? null,
                    'website' => $row['website'] ?? null,
                    'about' => $row['about'] ?? null,
                    'moe_listed' => false,
                    'visibility' => ['deadlines' => self::PUBLIC],
                    'status' => 'active',
                ]);
                $added++;
            }

            $source = $row['international_admissions_url'] ?? null;
            $verified = $row['verified_on'] ?? now()->toDateString();

            foreach ($row['programs'] ?? [] as $program) {
                $level = in_array($program['level'] ?? null, self::LEVELS, true) ? $program['level'] : 'bachelor';
                $uni->programs()->updateOrCreate(
                    ['name' => Str::limit($program['name'], 190, ''), 'level' => $level],
                    [
                        'teaching_language' => $program['language'] ?? null,
                        'duration_months' => isset($program['duration_years']) ? (int) round($program['duration_years'] * 12) : null,
                        'tuition_fee' => ($program['tuition_cny_per_year'] ?? 0) > 0 ? $program['tuition_cny_per_year'] : null,
                        'currency' => 'CNY',
                        'source_url' => $source,
                        'verified_on' => $verified,
                        'visibility' => ['tuition_fee' => self::PUBLIC],
                        'status' => 'active',
                    ],
                );
            }

            if (! empty($row['application_deadline'])) {
                $uni->intakes()->updateOrCreate(
                    ['name' => 'Application window for international students'],
                    [
                        'application_open_date' => $row['application_open_date'] ?? null,
                        'application_deadline' => $row['application_deadline'],
                        'status' => $row['application_deadline'] >= now()->toDateString() ? 'open' : 'closed',
                        'source_url' => $source,
                        'verified_on' => $verified,
                    ],
                );
            }
        }

        $this->command?->info("Additional universities added: {$added}.");
    }

    /** A short unique code such as YANU, YANU2. */
    private function code(string $name, $codes): string
    {
        $base = strtoupper(Str::of($name)->replaceMatches('/[^A-Za-z ]/', '')->explode(' ')->filter()->map(fn ($w) => $w[0])->implode(''));
        $base = substr($base ?: 'UNI', 0, 8);
        $code = $base;
        for ($i = 2; $codes->has($code); $i++) {
            $code = $base.$i;
        }
        $codes->put($code, true);

        return $code;
    }
}

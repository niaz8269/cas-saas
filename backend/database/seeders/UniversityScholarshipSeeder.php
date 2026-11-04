<?php

namespace Database\Seeders;

use App\Models\Scholarship;
use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Scholarships that a university or its province or city runs for international
 * students, read from each university's own admissions pages and written in CAS's
 * own words (every row carries its source_url). Dates are stored only when the
 * page gives a full date with a year that has not passed. Idempotent: keyed on slug.
 * Data: database/data/university_scholarships.json.
 */
class UniversityScholarshipSeeder extends Seeder
{
    private const VERIFIED_ON = '2026-11-04';

    private const PUBLIC = ['public', 'student', 'agent', 'counselor'];

    public function run(): void
    {
        $path = database_path('data/university_scholarships.json');
        if (! is_file($path)) {
            $this->command?->warn('university_scholarships.json not found; skipping.');

            return;
        }

        $count = 0;
        foreach (json_decode(file_get_contents($path), true)['universities'] as $slug => $rows) {
            $university = University::query()->where('slug', $slug)->first();
            if (! $university) {
                continue;
            }

            foreach ($rows as $r) {
                Scholarship::updateOrCreate(['slug' => $r['slug']], [
                    'university_id' => $university->id,
                    'scope' => 'university',
                    'name' => $r['name'],
                    'type' => $r['type'],
                    'coverage' => $r['coverage'],
                    'description' => $r['description'],
                    'eligibility' => $r['eligibility'],
                    'how_to_apply' => $r['how_to_apply'],
                    'deadline' => $r['deadline'],
                    'source_url' => $r['source_url'],
                    'verified_on' => self::VERIFIED_ON,
                    'visibility' => ['amount' => self::PUBLIC, 'coverage' => self::PUBLIC, 'deadline' => self::PUBLIC, 'how_to_apply' => self::PUBLIC],
                    'status' => 'active',
                ]);
                $count++;
            }
        }

        $this->command?->info("University scholarships seeded: {$count}.");
    }
}

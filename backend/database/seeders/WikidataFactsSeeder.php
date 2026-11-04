<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Fills a street address and student count from Wikidata (CC0) where the catalog
 * has none. Never overwrites a value that is already there.
 * Data: database/data/wikidata_facts.json.
 */
class WikidataFactsSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/wikidata_facts.json');
        if (! is_file($path)) {
            $this->command?->warn('wikidata_facts.json not found; skipping.');

            return;
        }

        $filled = 0;
        foreach (json_decode(file_get_contents($path), true)['universities'] as $slug => $facts) {
            $university = University::query()->where('slug', $slug)->first();
            if (! $university) {
                continue;
            }

            $changes = [];
            if (empty($university->address) && ! empty($facts['address'])) {
                $changes['address'] = $facts['address'];
            }
            if (empty($university->student_count) && ! empty($facts['students'])) {
                $changes['student_count'] = number_format((int) $facts['students']);
            }

            if ($changes) {
                $university->update($changes);
                $filled++;
            }
        }

        $this->command?->info("Wikidata facts applied to {$filled} universities.");
    }
}

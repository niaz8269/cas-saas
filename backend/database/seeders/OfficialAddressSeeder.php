<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Fills the street address (as written on the university's own website) where the
 * catalog has none. Never overwrites a value that is already there.
 * Data: database/data/official_addresses.json.
 */
class OfficialAddressSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/official_addresses.json');
        if (! is_file($path)) {
            $this->command?->warn('official_addresses.json not found; skipping.');

            return;
        }

        $filled = 0;
        foreach (json_decode(file_get_contents($path), true)['universities'] as $slug => $address) {
            $university = University::query()->where('slug', $slug)->first();
            if ($university && empty($university->address)) {
                $university->update(['address' => $address]);
                $filled++;
            }
        }

        $this->command?->info("Official addresses applied to {$filled} universities.");
    }
}

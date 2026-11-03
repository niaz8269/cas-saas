<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Square seal crops (frontend/public/logos/emblems) cut from each university's
 * own logo, for round avatars. Also supplies the Jiangsu University logo from
 * its official website, which the catalog did not have.
 */
class UniversityEmblemSeeder extends Seeder
{
    private const EMBLEMS = [
        'beijing-institute-of-technology' => 'bit',
        'dalian-medical-university' => 'dmu',
        'jilin-medical-university' => 'jlmu',
        'liaoning-petrochemical-university' => 'lnpu',
        'nanjing-university-of-information-science-and-technology' => 'nuist',
        'xinjiang-medical-university' => 'xjmu',
        'zhejiang-university-of-science-and-technology' => 'zust',
        'jiangsu-university' => 'ujs',
    ];

    public function run(): void
    {
        foreach (self::EMBLEMS as $slug => $name) {
            $uni = University::where('slug', $slug)->first();
            if (! $uni) {
                continue;
            }

            $uni->forceFill([
                'emblem_path' => "/logos/emblems/{$name}.png",
                'logo_path' => $uni->logo_path ?: "/logos/{$name}.png",
            ])->save();
        }

        // Logos and seals found on each university's own website (see catalog:fetch-logos).
        $path = database_path('data/university_logos_auto.json');
        $auto = is_file($path) ? (json_decode(file_get_contents($path), true) ?: []) : [];
        foreach ($auto as $slug => $files) {
            $uni = University::where('slug', $slug)->first();
            if (! $uni) {
                continue;
            }
            $uni->forceFill([
                'logo_path' => $uni->logo_path ?: ($files['logo'] ?? null),
                'emblem_path' => $uni->emblem_path ?: ($files['emblem'] ?? null),
            ])->save();
        }
    }
}

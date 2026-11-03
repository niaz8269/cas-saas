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
    }
}

<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * CAS-written university introductions (the short "about" paragraph), replacing
 * the third-party lead text the profile import first stored. Idempotent: keyed on slug.
 */
class UniversityIntroSeeder extends Seeder
{
    private const THIN = [
        'china-medical-university', 'dalian-polytechnic-university', 'hubei-university', 'northwest-university',
        'soochow-university', 'wuyi-university', 'yunnan-agricultural-university', 'zhejiang-normal-university',
    ];

    public function run(): void
    {
        $path = database_path('data/university_intros.json');
        $intros = is_file($path) ? (json_decode(file_get_contents($path), true) ?: []) : [];

        foreach ($intros as $slug => $text) {
            if (filled($text)) {
                University::where('slug', $slug)->update(['about' => $text]);
            }
        }

        // Sources too thin or ambiguous to rewrite (a bare "may refer to" line, or a garbled
        // figure): drop the third-party text and use the factual line built from catalog data.
        University::whereIn('slug', self::THIN)->update(['about' => null]);
        (new WikipediaProfileSeeder)->factualIntroductions();
    }
}

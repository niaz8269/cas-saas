<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * The long Overview text per university, built from the English Wikipedia
 * article of the university and of its city, plus the catalog's own programs,
 * application windows and scholarships (`php artisan catalog:build-overviews`).
 * Wikipedia text is CC BY-SA 4.0 and credited on the Photo credits page.
 */
class OverviewSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/university_overviews.json');
        $rows = is_file($path) ? (json_decode(file_get_contents($path), true) ?: []) : [];

        foreach ($rows as $slug => $sections) {
            University::where('slug', $slug)->update(['overview' => json_encode($sections, JSON_UNESCAPED_UNICODE)]);
        }
    }
}

<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * A distinct campus photo for each university, found on its Wikipedia articles
 * (freely licensed files on Wikimedia Commons), reviewed one by one. Replaces
 * the earlier cover, including shared city photos. Credits are kept in the
 * database and shown on the Photo credits page.
 */
class CampusPhotoSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/campus_photos.json');
        $rows = is_file($path) ? (json_decode(file_get_contents($path), true) ?: []) : [];

        foreach ($rows as $slug => $row) {
            University::where('slug', $slug)->update([
                'cover_path' => $row['cover_path'],
                'cover_credit' => $row['cover_credit'],
                'cover_source_url' => $row['cover_source_url'],
                'cover_is_city' => false,
            ]);
        }
    }
}

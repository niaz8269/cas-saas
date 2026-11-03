<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Points catalog photos at the copies served by the site itself
 * (frontend/public/photos, produced by `php artisan catalog:mirror-photos`)
 * instead of hotlinking Wikimedia. Runs last so reseeding the catalog from the
 * source data files never brings the external URLs back.
 */
class MirrorPhotosSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/photo_mirror.json');
        $manifest = is_file($path) ? (json_decode(file_get_contents($path), true) ?: []) : [];

        if ($manifest === []) {
            return;
        }

        foreach (University::whereNotNull('cover_path')->orWhereNotNull('logo_path')->get() as $uni) {
            $update = [];
            foreach (['cover_path', 'logo_path'] as $column) {
                if (isset($manifest[$uni->{$column}])) {
                    $update[$column] = $manifest[$uni->{$column}];
                }
            }

            if ($update !== []) {
                $uni->forceFill($update)->save();
            }
        }
    }
}

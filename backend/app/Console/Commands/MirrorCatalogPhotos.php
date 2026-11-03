<?php

namespace App\Console\Commands;

use App\Models\University;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Intervention\Image\ImageManager;

/**
 * Downloads every externally hosted catalog photo (Wikimedia Commons covers and
 * logos) once, shrinks it, and writes a url => local-path manifest so the site
 * can serve the files itself (Wikimedia is slow or blocked in some regions).
 *
 * Files go to storage/app/photo-mirror; copy that folder to frontend/public/photos.
 * Credits stay in the database; only the image location changes.
 */
class MirrorCatalogPhotos extends Command
{
    protected $signature = 'catalog:mirror-photos {--width=1000} {--quality=76}';

    protected $description = 'Download external catalog photos and write the mirror manifest';

    public function handle(): int
    {
        $dir = storage_path('app/photo-mirror');
        File::ensureDirectoryExists($dir);

        $manifestPath = database_path('data/photo_mirror.json');
        $manifest = is_file($manifestPath) ? (json_decode(file_get_contents($manifestPath), true) ?: []) : [];

        $urls = University::query()
            ->get(['cover_path', 'logo_path'])
            ->flatMap(fn ($u) => [$u->cover_path, $u->logo_path])
            ->filter(fn ($v) => is_string($v) && str_starts_with($v, 'https://upload.wikimedia.org/'))
            ->unique()
            ->values();

        $this->info($urls->count().' external photos, '.count($manifest).' already mirrored');
        $manager = ImageManager::gd();

        foreach ($urls as $url) {
            if (isset($manifest[$url]) && is_file($dir.'/'.basename($manifest[$url]))) {
                continue;
            }

            $response = null;
            foreach ([0, 5, 20] as $wait) {
                sleep($wait);
                $response = Http::withUserAgent('CASCatalogBot/1.0 (webai.auto@gmail.com)')->timeout(60)->get($url);
                if ($response->successful()) {
                    break;
                }
            }

            if (! $response || ! $response->successful()) {
                $this->warn('failed '.$response?->status().' '.$url);

                continue;
            }

            $hash = substr(sha1($url), 0, 14);
            if (preg_match('/\.svg$/i', parse_url($url, PHP_URL_PATH))) {
                $name = $hash.'.svg';
                file_put_contents($dir.'/'.$name, $response->body());
            } else {
                $name = $hash.'.webp';
                $image = $manager->read($response->body());
                if ($image->width() > (int) $this->option('width')) {
                    $image->scaleDown(width: (int) $this->option('width'));
                }
                file_put_contents($dir.'/'.$name, (string) $image->toWebp((int) $this->option('quality')));
            }

            $manifest[$url] = '/photos/'.$name;
            usleep(300_000);
        }

        ksort($manifest);
        file_put_contents($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");
        $this->info(count($manifest).' mirrored; files in '.$dir);

        return self::SUCCESS;
    }
}

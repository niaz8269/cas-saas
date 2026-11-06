<?php

namespace App\Services\Media;

use App\Models\University;
use Intervention\Image\ImageManager;
use ZipArchive;

/**
 * CAS-branded download of a catalog photo. Pages show every photo clean; only
 * this website-controlled export carries the CAS emblem. It is offered only for
 * photos whose licence allows redistribution with attribution (CC BY, CC BY-SA,
 * CC0, public domain), and always travels with an attribution file. The original
 * stays untouched on the site.
 */
class BrandedDownload
{
    /** The permitted licence named in a credit line such as "Author, CC BY-SA 4.0, via Wikimedia Commons". */
    public function licence(?string $credit): ?string
    {
        if (! $credit || preg_match('/\b(ND|NC)\b|-ND|-NC/i', $credit)) {
            return null;
        }

        return preg_match('/\b(CC BY(?:-SA)? \d\.\d|CC0(?: 1\.0)?|Public domain)\b/i', $credit, $m) ? $m[1] : null;
    }

    public function isAvailable(University $university): bool
    {
        return $this->sourceFile($university) !== null && $this->licence($university->cover_credit) !== null;
    }

    public function sourceFile(University $university): ?string
    {
        $path = (string) $university->cover_path;
        if (! str_starts_with($path, '/photos/') || str_contains($path, '..')) {
            return null;
        }

        $file = rtrim(config('media.public_path'), '/').$path;

        return is_file($file) ? $file : null;
    }

    /**
     * A copy of a site photo with the CAS emblem on it, for anything a visitor saves or drags out of
     * the page (the page itself shows the clean photo). Written once under public/wm and then served
     * as a plain file. Returns null when the photo may not be altered (licence forbids it or is not
     * recorded) or does not exist.
     */
    public function watermarkedCopy(string $folder, string $name): ?string
    {
        $public = rtrim(config('media.public_path'), '/');
        $allowed = $folder === 'photos' || ($folder === 'images' && preg_match('/^(hero|header)-/', $name));
        if (! $allowed || ! preg_match('/^[A-Za-z0-9._-]+\.webp$/', $name) || str_contains($name, '..')) {
            return null;
        }

        $source = "{$public}/{$folder}/{$name}";
        if (! is_file($source)) {
            return null;
        }

        if ($folder === 'photos') {
            $credit = University::where('cover_path', "/photos/{$name}")->value('cover_credit');
            // A photo that belongs to a university must carry a licence that allows adapting it.
            if ($credit !== null && $this->licence($credit) === null) {
                return null;
            }
        }

        $target = "{$public}/wm/{$folder}/".substr($name, 0, -5).'.jpg';
        if (is_file($target)) {
            return $target;
        }

        $image = ImageManager::gd()->read($source);
        if ($image->width() > 1600) {
            $image->scaleDown(width: 1600);
        }
        $emblem = ImageManager::gd()->read(resource_path('images/cas-emblem-white.png'));
        $emblem->scaleDown(width: max(64, (int) round($image->width() * 0.11)));
        $image->place($emblem, 'bottom-right', 20, 20, 88);

        if (! is_dir(dirname($target))) {
            mkdir(dirname($target), 0775, true);
        }
        file_put_contents($target, (string) $image->toJpeg(88));

        return $target;
    }

    /** Builds the zip (branded photo + attribution) and returns its temporary path. */
    public function zip(University $university): string
    {
        $source = $this->sourceFile($university);
        $image = ImageManager::gd()->read($source);
        if ($image->width() > 1600) {
            $image->scaleDown(width: 1600);
        }

        $emblem = ImageManager::gd()->read(resource_path('images/cas-emblem-white.png'));
        $emblem->scaleDown(width: max(48, (int) round($image->width() * 0.07)));
        $image->place($emblem, 'bottom-right', 16, 16, 70);

        $name = $university->slug ?: 'university';
        $tmp = tempnam(sys_get_temp_dir(), 'cas');
        $zip = new ZipArchive;
        $zip->open($tmp, ZipArchive::OVERWRITE);
        $zip->addFromString("{$name}-cover-cas.jpg", (string) $image->toJpeg(88));
        $zip->addFromString('ATTRIBUTION.txt', $this->attribution($university));
        $zip->close();

        return $tmp;
    }

    private function attribution(University $university): string
    {
        return implode("\n", array_filter([
            'Photo used on the CAS website page for '.$university->name.'.',
            '',
            'Credit: '.$university->cover_credit,
            $university->cover_source_url ? 'Original and licence: '.$university->cover_source_url : null,
            '',
            'The CAS emblem in this copy was added by CAS for distribution. It does not make CAS the owner of the photo.',
            'The photo remains under the licence above; keep this credit when you share it.',
        ]))."\n";
    }
}

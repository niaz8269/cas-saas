<?php

namespace App\Services\Media;

use Illuminate\Support\Facades\File;
use Intervention\Image\ImageManager;

/**
 * Small copies (480 px wide) of the site's photos for lists of cards, so a page of 24 universities does not
 * download 24 full-size photos. They live next to the originals, in /photos/thumbs/, and are made by
 * `catalog:make-thumbs`; a photo without one simply keeps using the original.
 */
class Thumbnails
{
    public const WIDTH = 480;

    public const QUALITY = 72;

    /** The site-relative URL of the small copy of a /photos/... image, when it has been made. */
    public function urlFor(?string $path): ?string
    {
        if (! $path || ! str_starts_with($path, '/photos/') || str_contains($path, '..')) {
            return null;
        }
        $relative = '/photos/thumbs/'.pathinfo($path, PATHINFO_FILENAME).'.webp';

        return is_file($this->root().$relative) ? $relative : null;
    }

    /** Makes (or refreshes) the small copy. Returns false when the original is missing or unreadable. */
    public function make(string $path): bool
    {
        if (! str_starts_with($path, '/photos/') || str_contains($path, '..') || ! is_file($this->root().$path)) {
            return false;
        }
        $target = $this->root().'/photos/thumbs/'.pathinfo($path, PATHINFO_FILENAME).'.webp';

        try {
            $image = ImageManager::gd()->read($this->root().$path);
            if ($image->width() > self::WIDTH) {
                $image->scaleDown(width: self::WIDTH);
            }
            File::ensureDirectoryExists(dirname($target));
            File::put($target, (string) $image->toWebp(self::QUALITY));
        } catch (\Throwable) {
            return false;
        }

        return true;
    }

    private function root(): string
    {
        return rtrim((string) config('media.public_path'), '/');
    }
}

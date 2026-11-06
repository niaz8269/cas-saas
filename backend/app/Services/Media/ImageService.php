<?php

namespace App\Services\Media;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;

/**
 * Catalog image handling: uploads are downscaled and re-encoded to WebP,
 * then stored on S3/MinIO. A stored value may be an object key (uploaded)
 * or an external URL — url() resolves either to something a browser can
 * load (presigned for keys, pass-through for URLs).
 */
class ImageService
{
    public const DISK = 's3';

    public const MAX_WIDTH = 1600;

    public const QUALITY = 82;

    /**
     * Convert an uploaded image to WebP and store it.
     *
     * @return array{path: string, url: string|null}
     */
    public function storeWebp(UploadedFile $file, string $folder = 'catalog'): array
    {
        $image = ImageManager::gd()->read($file->getRealPath());

        if ($image->width() > self::MAX_WIDTH) {
            $image->scaleDown(width: self::MAX_WIDTH);
        }

        $binary = (string) $image->toWebp(self::QUALITY);
        $key = trim($folder, '/').'/'.Str::uuid()->toString().'.webp';

        // No bucket: write into the web root and store a site-relative path, which
        // url() passes straight through like any other public asset.
        if (config('media.images_store') === 'public_path') {
            $relative = '/uploads/'.$key;
            $target = rtrim((string) config('media.public_path'), '/').$relative;

            File::ensureDirectoryExists(dirname($target));
            File::put($target, $binary);

            return ['path' => $relative, 'url' => $relative];
        }

        Storage::disk(self::DISK)->put($key, $binary);

        return ['path' => $key, 'url' => $this->url($key)];
    }

    /**
     * Resolve a stored image reference to a loadable URL. Pass-through for
     * external URLs; presigned (temporary) for object keys.
     */
    public function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        // External URLs and site-relative public assets (e.g. /logos/x.png) pass through.
        if (Str::startsWith($path, ['http://', 'https://', '/'])) {
            return $path;
        }

        $disk = Storage::disk(self::DISK);

        try {
            return $disk->temporaryUrl($path, now()->addWeek());
        } catch (\Throwable) {
            return $disk->url($path);
        }
    }
}

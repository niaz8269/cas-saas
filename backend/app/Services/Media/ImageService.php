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

        return $this->put($binary, trim($folder, '/').'/'.Str::uuid()->toString().'.webp');
    }

    /**
     * Store an uploaded PNG, JPG or WebP exactly as it was sent. Used for pictures that must stay pixel-exact, such
     * as a payment QR code that has to keep scanning. The caller validates that it is an image.
     *
     * @return array{path: string, url: string|null}
     */
    public function storeOriginal(UploadedFile $file, string $folder): array
    {
        // The real picture type, read from the bytes: the file name and the browser's claim are not trusted.
        $extension = match (@getimagesize($file->getRealPath())[2] ?? null) {
            IMAGETYPE_PNG => 'png',
            IMAGETYPE_WEBP => 'webp',
            IMAGETYPE_JPEG => 'jpg',
            default => throw new \InvalidArgumentException('Not a PNG, JPG or WebP picture.'),
        };

        return $this->put((string) File::get($file->getRealPath()), trim($folder, '/').'/'.Str::uuid()->toString().'.'.$extension);
    }

    /** Remove a stored image. External URLs and the site's own static files are never touched. */
    public function delete(?string $path): void
    {
        if ($path === null || $path === '' || Str::startsWith($path, ['http://', 'https://'])) {
            return;
        }

        if (Str::startsWith($path, '/uploads/')) {
            File::delete(rtrim((string) config('media.public_path'), '/').$path);

            return;
        }

        if (! Str::startsWith($path, '/')) {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    /** The bytes of a stored image, for embedding in a PDF. Null when it cannot be read. */
    public function contents(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        try {
            if (Str::startsWith($path, '/uploads/')) {
                $file = rtrim((string) config('media.public_path'), '/').$path;

                return is_file($file) ? (string) File::get($file) : null;
            }

            return Str::startsWith($path, ['http://', 'https://', '/']) ? null : Storage::disk(self::DISK)->get($path);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array{path: string, url: string|null}
     */
    private function put(string $binary, string $key): array
    {
        // No bucket: write into the web root and store a site-relative path, which
        // url() passes straight through like any other public asset.
        if (config('media.images_store') === 'public_path') {
            $relative = '/uploads/'.$key;
            $target = rtrim((string) config('media.public_path'), '/').$relative;

            File::ensureDirectoryExists(dirname($target));
            $this->guardUploadsFolder(rtrim((string) config('media.public_path'), '/').'/uploads');
            File::put($target, $binary);

            return ['path' => $relative, 'url' => $relative];
        }

        Storage::disk(self::DISK)->put($key, $binary);

        return ['path' => $key, 'url' => $this->url($key)];
    }

    /** Writes an .htaccess into the uploads folder so nothing in it can ever execute as a script. */
    private function guardUploadsFolder(string $dir): void
    {
        $file = $dir.'/.htaccess';

        if (is_file($file)) {
            return;
        }

        File::put($file, "Options -Indexes -ExecCGI\n<FilesMatch \"(?i)\\.(php|phtml|phar|php[0-9]|pl|py|cgi|sh|asp|aspx|jsp)$\">\n    Require all denied\n</FilesMatch>\n");
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

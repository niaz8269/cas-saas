<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\University;
use App\Services\Media\BrandedDownload;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PublicMediaController extends Controller
{
    public function coverDownload(string $slug, BrandedDownload $downloads): BinaryFileResponse
    {
        $university = University::where('slug', $slug)->where('status', 'active')->firstOrFail();
        abort_unless($downloads->isAvailable($university), 404);

        return response()->download($downloads->zip($university), $university->slug.'-cover-cas.zip', ['Content-Type' => 'application/zip'])
            ->deleteFileAfterSend(true);
    }

    /** CAS-emblem copy of a site photo, used when a visitor saves or drags a photo out of a page. */
    public function watermarked(string $folder, string $name, BrandedDownload $downloads)
    {
        $file = $downloads->watermarkedCopy($folder, $name);
        if ($file === null) {
            // Not alterable (or unknown): hand back the original, never an error in the middle of a save.
            return redirect("/{$folder}/{$name}", 302);
        }

        return response()->file($file, ['Content-Type' => 'image/jpeg', 'Cache-Control' => 'public, max-age=31536000']);
    }
}

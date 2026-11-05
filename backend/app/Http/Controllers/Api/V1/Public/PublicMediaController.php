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
}

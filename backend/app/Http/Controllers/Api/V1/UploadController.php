<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Media\UploadImageRequest;
use App\Services\Media\ImageService;
use Illuminate\Http\JsonResponse;

/**
 * Catalog image uploads. The uploaded image is converted to WebP and
 * stored on S3/MinIO; the returned `path` is what a catalog record saves,
 * and `url` is an immediate preview. Route is gated to catalog managers.
 */
class UploadController extends Controller
{
    public function image(UploadImageRequest $request, ImageService $images): JsonResponse
    {
        return response()->json(
            $images->storeWebp($request->file('image'), 'catalog'),
        );
    }
}

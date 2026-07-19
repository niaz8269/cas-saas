<?php

namespace App\Http\Controllers\Api\V1\Ingest;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ingest\IngestApplicationRequest;
use App\Models\ApiSource;
use App\Services\Admissions\IngestApplicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class IngestApplicationController extends Controller
{
    private const IDEMPOTENCY_TTL_HOURS = 24;

    public function __invoke(IngestApplicationRequest $request, IngestApplicationService $service): JsonResponse
    {
        /** @var ApiSource $source */
        $source = $request->attributes->get('apiSource');

        $idempotencyKey = $request->header('Idempotency-Key');
        $cacheKey = $idempotencyKey
            ? sprintf('ingest:app:idem:%d:%s', $source->id, $idempotencyKey)
            : null;

        if ($cacheKey && ($cached = Cache::get($cacheKey))) {
            return response()
                ->json($cached['body'], $cached['status'])
                ->header('Idempotency-Replayed', 'true');
        }

        $result = $service->ingest($source, $request->validated());

        if ($cacheKey) {
            Cache::put($cacheKey, $result, now()->addHours(self::IDEMPOTENCY_TTL_HOURS));
        }

        return response()->json($result['body'], $result['status']);
    }
}

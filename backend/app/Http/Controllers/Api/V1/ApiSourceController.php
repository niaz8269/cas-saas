<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Integrations\StoreApiKeyRequest;
use App\Http\Requests\Integrations\StoreApiSourceRequest;
use App\Http\Requests\Integrations\UpdateApiSourceRequest;
use App\Http\Resources\ApiSourceResource;
use App\Models\ApiKey;
use App\Models\ApiSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin management of ingestion sources and their API keys (the CLI equivalent
 * of the cas:api-key command). Authorization is enforced by the
 * permission:settings.manage.global route middleware.
 */
class ApiSourceController extends Controller
{
    private const RELATIONS = ['university:id,name', 'defaultProgram:id,name,level', 'apiKeys'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $sources = ApiSource::query()
            ->with(self::RELATIONS)
            ->withCount('activeKeys')
            ->when($request->filled('q'), fn ($q) => $q->where('name', 'like', '%'.$request->string('q').'%'))
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        return ApiSourceResource::collection($sources);
    }

    public function store(StoreApiSourceRequest $request): ApiSourceResource
    {
        $source = ApiSource::create($request->validated());

        return new ApiSourceResource($source->load(self::RELATIONS)->loadCount('activeKeys'));
    }

    public function update(UpdateApiSourceRequest $request, ApiSource $apiSource): ApiSourceResource
    {
        $apiSource->update($request->validated());

        return new ApiSourceResource($apiSource->load(self::RELATIONS)->loadCount('activeKeys'));
    }

    public function destroy(ApiSource $apiSource): Response
    {
        $apiSource->delete();

        return response()->noContent();
    }

    /**
     * Mint a new key for the source. The plain key is returned exactly once —
     * only its hash is stored.
     */
    public function storeKey(StoreApiKeyRequest $request, ApiSource $apiSource): JsonResponse
    {
        $plainKey = 'cas_'.Str::random(40);

        $key = $apiSource->apiKeys()->create([
            'key_hash' => ApiKey::hashKey($plainKey),
            'rate_limit' => $request->integer('rate_limit') ?: 60,
        ]);

        return response()->json([
            'plain_key' => $plainKey, // shown once; not recoverable
            'source' => new ApiSourceResource($apiSource->load(self::RELATIONS)->loadCount('activeKeys')),
            'key_id' => $key->id,
        ], 201);
    }

    /** Revoke a key (kept for history rather than deleted). */
    public function destroyKey(ApiSource $apiSource, ApiKey $apiKey): Response
    {
        abort_unless($apiKey->api_source_id === $apiSource->id, 404);

        if ($apiKey->revoked_at === null) {
            $apiKey->update(['revoked_at' => now()]);
        }

        return response()->noContent();
    }
}

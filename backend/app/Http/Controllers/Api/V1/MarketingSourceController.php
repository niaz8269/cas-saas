<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Marketing\StoreMarketingSourceRequest;
use App\Http\Requests\Marketing\UpdateMarketingSourceRequest;
use App\Http\Resources\MarketingSourceResource;
use App\Models\MarketingSource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class MarketingSourceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', MarketingSource::class);

        $sources = MarketingSource::query()
            ->withCount('campaigns')
            ->when($request->filled('filter.is_active'), fn ($q) => $q->where('is_active', $request->boolean('filter.is_active')))
            ->when($request->filled('q'), fn ($q) => $q->where('name', 'like', '%'.$request->string('q').'%'))
            ->orderBy('name')
            ->paginate(min($request->integer('per_page', 25), 100));

        return MarketingSourceResource::collection($sources);
    }

    public function store(StoreMarketingSourceRequest $request): MarketingSourceResource
    {
        $this->authorize('create', MarketingSource::class);

        return new MarketingSourceResource(MarketingSource::create($request->validated()));
    }

    public function show(MarketingSource $marketingSource): MarketingSourceResource
    {
        $this->authorize('view', $marketingSource);

        return new MarketingSourceResource($marketingSource->loadCount('campaigns'));
    }

    public function update(UpdateMarketingSourceRequest $request, MarketingSource $marketingSource): MarketingSourceResource
    {
        $this->authorize('update', $marketingSource);

        $marketingSource->update($request->validated());

        return new MarketingSourceResource($marketingSource->loadCount('campaigns'));
    }

    public function destroy(MarketingSource $marketingSource): Response
    {
        $this->authorize('delete', $marketingSource);

        $marketingSource->delete();

        return response()->noContent();
    }
}

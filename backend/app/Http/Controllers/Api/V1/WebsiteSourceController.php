<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Marketing\StoreWebsiteSourceRequest;
use App\Http\Requests\Marketing\UpdateWebsiteSourceRequest;
use App\Http\Resources\WebsiteSourceResource;
use App\Models\WebsiteSource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class WebsiteSourceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', WebsiteSource::class);

        $sources = WebsiteSource::query()
            ->when($request->filled('filter.is_active'), fn ($q) => $q->where('is_active', $request->boolean('filter.is_active')))
            ->when($request->filled('q'), fn ($q) => $q->where('domain', 'like', '%'.$request->string('q').'%'))
            ->orderBy('domain')
            ->paginate(min($request->integer('per_page', 25), 100));

        return WebsiteSourceResource::collection($sources);
    }

    public function store(StoreWebsiteSourceRequest $request): WebsiteSourceResource
    {
        $this->authorize('create', WebsiteSource::class);

        return new WebsiteSourceResource(WebsiteSource::create($request->validated()));
    }

    public function show(WebsiteSource $websiteSource): WebsiteSourceResource
    {
        $this->authorize('view', $websiteSource);

        return new WebsiteSourceResource($websiteSource);
    }

    public function update(UpdateWebsiteSourceRequest $request, WebsiteSource $websiteSource): WebsiteSourceResource
    {
        $this->authorize('update', $websiteSource);

        $websiteSource->update($request->validated());

        return new WebsiteSourceResource($websiteSource);
    }

    public function destroy(WebsiteSource $websiteSource): Response
    {
        $this->authorize('delete', $websiteSource);

        $websiteSource->delete();

        return response()->noContent();
    }
}

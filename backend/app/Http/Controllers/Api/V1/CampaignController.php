<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Marketing\StoreCampaignRequest;
use App\Http\Requests\Marketing\UpdateCampaignRequest;
use App\Http\Resources\CampaignResource;
use App\Models\Campaign;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class CampaignController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Campaign::class);

        $campaigns = Campaign::query()
            ->with('marketingSource:id,name')
            ->when($request->filled('filter.marketing_source_id'), fn ($q) => $q->where('marketing_source_id', $request->input('filter.marketing_source_id')))
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->where('name', 'like', $term)
                    ->orWhere('utm_campaign', 'like', $term));
            })
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        return CampaignResource::collection($campaigns);
    }

    public function store(StoreCampaignRequest $request): CampaignResource
    {
        $this->authorize('create', Campaign::class);

        return new CampaignResource(Campaign::create($request->validated())->load('marketingSource:id,name'));
    }

    public function show(Campaign $campaign): CampaignResource
    {
        $this->authorize('view', $campaign);

        return new CampaignResource($campaign->load('marketingSource:id,name'));
    }

    public function update(UpdateCampaignRequest $request, Campaign $campaign): CampaignResource
    {
        $this->authorize('update', $campaign);

        $campaign->update($request->validated());

        return new CampaignResource($campaign->load('marketingSource:id,name'));
    }

    public function destroy(Campaign $campaign): Response
    {
        $this->authorize('delete', $campaign);

        $campaign->delete();

        return response()->noContent();
    }
}

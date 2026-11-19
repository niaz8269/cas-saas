<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Resources\Exclusives\ExclusiveMaterialResource;
use App\Http\Resources\Exclusives\ExclusiveOfferResource;
use App\Models\ExclusiveMaterial;
use App\Models\ExclusiveOffer;
use App\Services\Content\ExclusiveMaterialStorage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The agency portal's Exclusives section: published offers, the agency's own commission level, and the files.
 * Only approved (active) agency accounts reach it.
 */
class AgentExclusiveController extends Controller
{
    public function __construct(private readonly ExclusiveMaterialStorage $files) {}

    /** @return array<string, mixed> */
    public function index(Request $request): array
    {
        $this->authorizeAgency($request);

        $offers = ExclusiveOffer::query()
            ->with(['university:id,name,slug,city,province,logo_path,emblem_path,cover_path', 'program:id,name,level', 'materials'])
            ->where('status', 'published')
            ->where('audience', 'partners')
            ->orderBy('sort_order')->orderByDesc('published_at')
            ->get();

        return [
            'data' => ExclusiveOfferResource::collection($offers)->resolve($request),
            'library' => ExclusiveMaterialResource::collection(ExclusiveMaterial::whereNull('exclusive_offer_id')->orderBy('title')->get())->resolve($request),
        ];
    }

    public function download(Request $request, ExclusiveMaterial $material): StreamedResponse
    {
        $this->authorizeAgency($request);

        // A file of an offer is available only while the offer is published and not private.
        if ($material->exclusive_offer_id) {
            abort_unless(ExclusiveOffer::where('id', $material->exclusive_offer_id)->where('status', 'published')->where('audience', 'partners')->exists(), 404);
        }

        return $this->files->download($material, $request, ['agent_id' => $request->user()->id]);
    }

    /** Active agencies only; sets the level used to pick the commission shown. */
    private function authorizeAgency(Request $request): void
    {
        $agent = $request->user();
        abort_unless($agent && $agent->status === 'active', 403, 'Your agency account is not approved yet.');
        $request->attributes->set('exclusive_agent_level', in_array($agent->type, ExclusiveOffer::LEVELS, true) ? $agent->type : 'partner');
    }
}

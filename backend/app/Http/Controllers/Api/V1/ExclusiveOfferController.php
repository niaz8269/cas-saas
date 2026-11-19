<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Exclusives\SaveExclusiveOfferRequest;
use App\Http\Requests\Exclusives\StoreExclusiveMaterialRequest;
use App\Http\Resources\Exclusives\ExclusiveMaterialResource;
use App\Http\Resources\Exclusives\ExclusiveOfferResource;
use App\Models\ExclusiveMaterial;
use App\Models\ExclusiveOffer;
use App\Services\Content\ExclusiveMaterialStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Exclusive programs and universities for agencies, managed by staff: exclusives.view.global (read, counselors
 * and admins) and exclusives.manage.global (write, admins).
 */
class ExclusiveOfferController extends Controller
{
    public function __construct(private readonly ExclusiveMaterialStorage $files) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $offers = ExclusiveOffer::query()
            ->with(['university:id,name,slug,city,province,logo_path,emblem_path,cover_path', 'program:id,name,level'])
            ->withCount('materials')
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.type'), fn ($q) => $q->where('offer_type', $request->input('filter.type')))
            ->when($request->filled('filter.audience'), fn ($q) => $q->where('audience', $request->input('filter.audience')))
            ->when($request->filled('q'), fn ($q) => $q->where('title', 'like', '%'.$request->string('q').'%'))
            ->orderBy('sort_order')->orderByDesc('updated_at')
            ->paginate(min($request->integer('per_page', 20), 100));

        return ExclusiveOfferResource::collection($offers);
    }

    public function show(ExclusiveOffer $exclusive): ExclusiveOfferResource
    {
        return new ExclusiveOfferResource($exclusive->load(['university:id,name,slug,city,province,logo_path,emblem_path,cover_path', 'program:id,name,level', 'materials']));
    }

    public function store(SaveExclusiveOfferRequest $request): ExclusiveOfferResource
    {
        $data = $this->payload($request);
        $data['slug'] = ExclusiveOffer::uniqueSlug($data['title']);
        $data['created_by'] = $request->user()->id;

        return $this->show(ExclusiveOffer::create($data));
    }

    public function update(SaveExclusiveOfferRequest $request, ExclusiveOffer $exclusive): ExclusiveOfferResource
    {
        $exclusive->update($this->payload($request, $exclusive));

        return $this->show($exclusive->refresh());
    }

    public function destroy(ExclusiveOffer $exclusive): JsonResponse
    {
        $exclusive->materials->each(fn (ExclusiveMaterial $m) => $this->files->delete($m));
        $exclusive->delete();

        return response()->json(['message' => 'Exclusive removed.']);
    }

    // ── Files ───────────────────────────────────────────────────────────────

    /** Files not tied to one offer: the general agency library. */
    public function library(): AnonymousResourceCollection
    {
        return ExclusiveMaterialResource::collection(ExclusiveMaterial::whereNull('exclusive_offer_id')->orderBy('title')->get());
    }

    public function storeMaterial(StoreExclusiveMaterialRequest $request, ?ExclusiveOffer $exclusive = null): ExclusiveMaterialResource
    {
        $material = $this->files->store($request->file('file'), $request->validated(), $exclusive?->id, $request->user()->id);

        return new ExclusiveMaterialResource($material);
    }

    public function destroyMaterial(ExclusiveMaterial $material): JsonResponse
    {
        $this->files->delete($material);

        return response()->json(['message' => 'File removed.']);
    }

    public function downloadMaterial(Request $request, ExclusiveMaterial $material): StreamedResponse
    {
        return $this->files->download($material, $request, ['user_id' => $request->user()->id]);
    }

    /** @return array<string, mixed> */
    private function payload(SaveExclusiveOfferRequest $request, ?ExclusiveOffer $existing = null): array
    {
        $data = $request->validated();
        $data['updated_by'] = $request->user()->id;
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['commission_rates'] = $this->cleanRates($data['commission_rates'] ?? []);
        $data['fee_structure'] = array_values($data['fee_structure'] ?? []);
        $data['eligible_nationalities'] = array_values(array_unique($data['eligible_nationalities'] ?? []));
        $data['restricted_nationalities'] = array_values(array_unique($data['restricted_nationalities'] ?? []));

        if ($data['offer_type'] === 'other') {
            $data['university_id'] = $data['program_id'] = null;
        }
        // The date it first went live: kept when it is edited, cleared when it goes back to draft.
        $data['published_at'] = $data['status'] === 'published' ? ($existing?->published_at ?? now()) : null;

        return $data;
    }

    /**
     * Keeps only the agency levels that have a value.
     *
     * @param  array<string, mixed>  $rates
     * @return array<string, array<string, mixed>>
     */
    private function cleanRates(array $rates): array
    {
        $out = [];
        foreach (ExclusiveOffer::LEVELS as $level) {
            $r = $rates[$level] ?? null;
            if (is_array($r) && isset($r['value']) && $r['value'] !== '') {
                $out[$level] = ['type' => 'fixed', 'value' => (float) $r['value'], 'currency' => 'CNY'];
            }
        }

        return $out;
    }
}

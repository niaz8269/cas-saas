<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Exclusives\SaveExclusiveOfferRequest;
use App\Http\Requests\Exclusives\StoreExclusiveMaterialRequest;
use App\Http\Resources\Exclusives\ExclusiveMaterialResource;
use App\Http\Resources\Exclusives\ExclusiveOfferResource;
use App\Models\Agent;
use App\Models\ExclusiveMaterial;
use App\Models\ExclusiveOffer;
use App\Models\Notification;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Services\Comms\NotificationService;
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
            ->with(['university:id,name,slug,city,province,logo_path,emblem_path,cover_path', 'program:id,name,level', 'scholarship:id,name'])
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
        return new ExclusiveOfferResource($exclusive->load(['university:id,name,slug,city,province,logo_path,emblem_path,cover_path', 'program:id,name,level', 'scholarship:id,name', 'materials']));
    }

    public function store(SaveExclusiveOfferRequest $request): ExclusiveOfferResource
    {
        $data = $this->payload($request);
        $data['slug'] = ExclusiveOffer::uniqueSlug($data['title']);
        $data['created_by'] = $request->user()->id;

        $offer = ExclusiveOffer::create($data);
        $this->announce($offer);

        return $this->show($offer);
    }

    public function update(SaveExclusiveOfferRequest $request, ExclusiveOffer $exclusive): ExclusiveOfferResource
    {
        $exclusive->update($this->payload($request, $exclusive));
        $this->announce($exclusive->refresh());

        return $this->show($exclusive);
    }

    /**
     * Tells every approved agency, once, that an exclusive is now available to it: a bell entry in the partner
     * portal. Nothing is sent for drafts or private exclusives, and editing or republishing does not repeat it.
     */
    private function announce(ExclusiveOffer $offer): void
    {
        if ($offer->status !== 'published' || $offer->audience !== 'partners') {
            return;
        }
        $type = 'exclusive.published';
        if (Notification::where('type', $type)->where('entity_type', 'exclusive_offer')->where('entity_id', $offer->id)->exists()) {
            return;
        }

        $notifications = app(NotificationService::class);
        Agent::query()->where('status', 'active')->pluck('id')->each(fn (int $agentId) => $notifications->pushToAgent(
            $agentId, $type, 'New exclusive', '"'.$offer->title.'" is now available in Exclusives.', 'exclusive_offer', $offer->id,
        ));
    }

    public function destroy(ExclusiveOffer $exclusive): JsonResponse
    {
        $exclusive->materials->each(fn (ExclusiveMaterial $m) => $this->files->delete($m));
        $exclusive->delete();

        return response()->json(['message' => 'Exclusive removed.']);
    }

    /**
     * Names for the pickers in the exclusive form: universities, programs or scholarships. Every word typed must
     * match the name or the university's name, so "mbbs hebei" finds that program at Hebei universities.
     */
    public function lookup(Request $request): JsonResponse
    {
        $type = $request->string('type')->toString();
        abort_unless(in_array($type, ['university', 'program', 'scholarship'], true), 422, 'Unknown type.');

        $words = array_filter(preg_split('/\s+/', trim($request->string('q')->toString())) ?: []);
        $query = match ($type) {
            'university' => University::query(),
            'program' => Program::query()->with('university:id,name'),
            'scholarship' => Scholarship::query()->with('university:id,name'),
        };

        foreach ($words as $word) {
            $like = '%'.addcslashes($word, '%_\\').'%';
            $query->where(function ($q) use ($type, $like) {
                $q->where('name', 'like', $like);
                if ($type !== 'university') {
                    $q->orWhereHas('university', fn ($u) => $u->where('name', 'like', $like));
                }
            });
        }

        $total = (clone $query)->count();
        $rows = $query->orderBy('name')->limit(50)->get();

        return response()->json([
            'total' => $total,
            'data' => $rows->map(fn ($r) => [
                'id' => $r->id,
                'label' => $type === 'university' ? $r->name : trim($r->name.($r->university ? ' · '.$r->university->name : '')),
            ])->values(),
        ]);
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

        $data = $this->cleanLinks($data);
        // The date it first went live: kept when it is edited, cleared when it goes back to draft.
        $data['published_at'] = $data['status'] === 'published' ? ($existing?->published_at ?? now()) : null;

        return $data;
    }

    private function clean(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /**
     * Keeps only the link that matches the type (university, program or scholarship) and fills the university from
     * the program or scholarship picked, so the form only asks for what the exclusive is about.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function cleanLinks(array $data): array
    {
        $type = $data['offer_type'];
        $data['program_id'] = $type === 'program' ? ($data['program_id'] ?? null) : null;
        $data['scholarship_id'] = $type === 'scholarship' ? ($data['scholarship_id'] ?? null) : null;
        $data['university_id'] = in_array($type, ['other', 'city'], true) ? null : ($data['university_id'] ?? null);

        if ($data['program_id']) {
            $data['university_id'] = Program::whereKey($data['program_id'])->value('university_id');
        } elseif ($data['scholarship_id']) {
            $data['university_id'] = Scholarship::whereKey($data['scholarship_id'])->value('university_id');
        }

        // A name typed by hand is kept only when nothing from the catalog was picked.
        $inCatalog = $data['program_id'] || $data['scholarship_id'] || $data['university_id'];
        $manual = in_array($type, ['university', 'program', 'scholarship'], true) && ! $inCatalog;
        $data['custom_name'] = $manual ? $this->clean($data['custom_name'] ?? null) : null;
        $data['custom_university'] = $manual && $type !== 'university' ? $this->clean($data['custom_university'] ?? null) : null;

        // A city or province, with the programs advertised there.
        $isCity = $type === 'city';
        $data['city'] = $isCity ? $this->clean($data['city'] ?? null) : null;
        $data['province'] = $isCity ? $this->clean($data['province'] ?? null) : null;
        $data['programs_list'] = $isCity ? array_values(array_unique(array_filter(array_map(fn ($n) => $this->clean($n), $data['programs_list'] ?? [])))) : null;

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

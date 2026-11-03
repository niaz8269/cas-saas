<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\Public\PublicProgramResource;
use App\Http\Resources\Public\PublicScholarshipResource;
use App\Http\Resources\Public\PublicUniversityResource;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Services\Media\ImageService;
use App\Services\Public\AudienceResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

/**
 * Read-only catalog for the public website. Only active universities and
 * their active programs / open intakes / active scholarships are exposed;
 * commission agreements and internal data never appear. Authentication is
 * OPTIONAL: a logged-in student/agent/staff token widens the "audience" so
 * gated specifics (fees, deadlines, service charges) become visible and the
 * program fee shows the viewer's role rate.
 */
class PublicCatalogController extends Controller
{
    public function __construct(private readonly AudienceResolver $audiences) {}

    /** Resolve the audience for this request and expose it to the resources. */
    private function audience(Request $request): string
    {
        $audience = $this->audiences->resolve($request);
        $request->attributes->set('audience', $audience);

        return $audience;
    }

    public function universities(Request $request): AnonymousResourceCollection
    {
        $audience = $this->audience($request);

        $universities = University::query()
            ->where('status', 'active')
            ->with('country:id,name,iso2')
            ->withCount(['programs' => fn ($q) => $q->where('status', 'active')])
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->where('name', 'like', $term)
                    ->orWhere('name_zh', 'like', $term)
                    ->orWhere('city', 'like', $term)
                    ->orWhere('province', 'like', $term));
            })
            ->when($request->filled('filter.country_id'), fn ($q) => $q->where('country_id', $request->input('filter.country_id')))
            ->when($request->filled('filter.city'), fn ($q) => $q->where('city', $request->input('filter.city')))
            ->when($request->boolean('filter.moe_listed'), fn ($q) => $q->where('moe_listed', true))
            // Universities with a published admission window that has not yet closed.
            ->when($request->boolean('filter.open_intake'), fn ($q) => $q->whereHas('intakes', fn ($i) => $i
                ->where('status', 'open')
                ->where(fn ($d) => $d->whereNull('application_deadline')->orWhere('application_deadline', '>=', now()->toDateString()))))
            ->orderBy('name')
            ->paginate(min($request->integer('per_page', 24), 50));

        // Distinct cities for the directory filter (active universities only).
        $cities = University::query()
            ->where('status', 'active')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->orderBy('city')
            ->pluck('city');

        return PublicUniversityResource::collection($universities)
            ->additional(['cities' => $cities, 'city_stats' => $this->cityStats(), 'audience' => $audience]);
    }

    /**
     * Per-city university counts with a photo for the destinations page: the
     * city photo when there is one, otherwise a campus photo of a university
     * in that city.
     *
     * @return list<array<string, mixed>>
     */
    private function cityStats(): array
    {
        $images = app(ImageService::class);

        return University::query()
            ->where('status', 'active')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->orderBy('name')
            ->get(['city', 'cover_path', 'cover_credit', 'cover_is_city'])
            ->groupBy('city')
            ->map(function ($rows, $city) use ($images) {
                $photo = $rows->firstWhere('cover_is_city', true) ?? $rows->first(fn ($u) => filled($u->cover_path));

                return [
                    'city' => $city,
                    'count' => $rows->count(),
                    'photo_url' => $photo ? $images->url($photo->cover_path) : null,
                    'photo_credit' => $photo?->cover_credit,
                    'photo_is_city' => (bool) $photo?->cover_is_city,
                ];
            })
            ->sortBy([['count', 'desc'], ['city', 'asc']])
            ->values()
            ->all();
    }

    /**
     * Attribution for the freely licensed photos used on the site. The photos
     * carry the CAS mark; their authors and licences are listed on one page.
     */
    public function photoCredits(): JsonResponse
    {
        $rows = University::query()
            ->where('status', 'active')
            ->where(fn ($q) => $q->whereNotNull('cover_credit')->orWhereNotNull('wikipedia_url'))
            ->orderBy('name')
            ->get(['name', 'slug', 'cover_credit', 'cover_source_url', 'cover_is_city', 'wikipedia_url'])
            ->map(fn ($u) => [
                'university' => $u->name,
                'slug' => $u->slug,
                'credit' => $u->cover_credit,
                'source_url' => $u->cover_source_url,
                'kind' => $u->cover_is_city ? 'city' : 'campus',
                'text_source_url' => $u->wikipedia_url,
            ])
            ->values();

        return response()->json(['data' => $rows]);
    }

    /** A city landing page: its universities and the city sections of their overviews. */
    public function city(Request $request, string $slug): JsonResponse
    {
        $audience = $this->audience($request);
        $all = University::query()->where('status', 'active')->whereNotNull('city')->orderBy('name')->get();
        $city = $all->first(fn ($u) => Str::slug($u->city) === $slug)?->city;
        abort_unless($city, 404);

        $inCity = $all->filter(fn ($u) => $u->city === $city)->values();
        $keep = ['Studying in '.$city, 'Geography', 'Climate', 'Economy', 'Culture', 'Education', 'Transport', 'Transportation', 'Cuisine', 'Tourism', 'Demographics'];
        $sections = [];
        foreach ($inCity as $u) {
            $sections = collect($u->overview ?? [])->filter(fn ($s) => in_array($s['h'] ?? '', $keep, true) && ($s['blocks'] ?? []))->values()->all();
            if (count($sections) >= 3) {
                break;
            }
        }

        return response()->json([
            'city' => $city,
            'province' => $inCity->first()->province,
            'sections' => $sections,
            'universities' => PublicUniversityResource::collection($inCity)->additional(['audience' => $audience])->toResponse($request)->getData(true)['data'],
        ]);
    }

    public function university(Request $request, string $slug): PublicUniversityResource
    {
        $audience = $this->audience($request);

        $university = University::query()
            ->where('status', 'active')
            ->where('slug', $slug)
            ->with([
                'country:id,name,iso2',
                'programs' => fn ($q) => $q->where('status', 'active')->orderBy('name'),
                'intakes' => fn ($q) => $q->whereIn('status', ['open', 'closed'])->with('program:id,name')->orderBy('application_deadline'),
                'scholarships' => fn ($q) => $q->where('status', 'active')->orderBy('name'),
            ])
            ->firstOrFail();

        return (new PublicUniversityResource($university))->additional(['audience' => $audience]);
    }

    /**
     * Program finder across all active universities. Filterable by level,
     * teaching language, budget and university; degrees first, cheapest first within a level.
     */
    public function programs(Request $request): AnonymousResourceCollection
    {
        $audience = $this->audience($request);

        $programs = Program::query()
            ->where('status', 'active')
            ->whereHas('university', fn ($q) => $q->where('status', 'active'))
            ->with('university:id,name,slug,cover_path,cover_credit')
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', '%'.$request->string('q').'%')->orWhere('name_zh', 'like', '%'.$request->string('q').'%')))
            ->when($request->filled('filter.level'), fn ($q) => $q->where('level', $request->input('filter.level')))
            ->when($request->boolean('filter.open_intake'), fn ($q) => $q->whereHas('university.intakes', fn ($i) => $i
                ->where('status', 'open')
                ->where(fn ($d) => $d->whereNull('application_deadline')->orWhere('application_deadline', '>=', now()->toDateString()))))
            ->when($request->filled('filter.language'), fn ($q) => $q->where('teaching_language', 'like', '%'.$request->input('filter.language').'%'))
            ->when($request->filled('filter.max_fee'), fn ($q) => $q->where('tuition_fee', '<=', (float) $request->input('filter.max_fee')))
            ->when($request->filled('filter.university_slug'), fn ($q) => $q->whereHas('university', fn ($uq) => $uq->where('slug', $request->input('filter.university_slug'))))
            // Degrees first (bachelor, master, doctorate, then non-degree and language courses), cheapest first within each.
            ->orderByRaw("case level when 'bachelor' then 1 when 'master' then 2 when 'phd' then 3 when 'non_degree' then 4 else 5 end")
            ->orderByRaw('tuition_fee is null, tuition_fee')
            ->orderBy('name')
            ->paginate(min($request->integer('per_page', 24), 50));

        return PublicProgramResource::collection($programs)->additional(['audience' => $audience]);
    }

    /** Active scholarships across all active universities. */
    public function scholarships(Request $request): AnonymousResourceCollection
    {
        $audience = $this->audience($request);

        $scholarships = Scholarship::query()
            ->where('status', 'active')
            ->where(fn ($q) => $q->where('scope', 'government')->orWhereHas('university', fn ($u) => $u->where('status', 'active')))
            ->with('university:id,name,slug,cover_path,cover_credit')
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('type', 'like', $term));
            })
            ->when($request->filled('filter.type'), fn ($q) => $q->where('type', $request->input('filter.type')))
            ->when($request->filled('filter.university_slug'), fn ($q) => $q->whereHas('university', fn ($uq) => $uq->where('slug', $request->input('filter.university_slug'))))
            ->orderBy('name')
            ->paginate(min($request->integer('per_page', 24), 50));

        // Distinct scholarship types for the filter (active + on active universities).
        $types = Scholarship::query()
            ->where('status', 'active')
            ->where(fn ($q) => $q->where('scope', 'government')->orWhereHas('university', fn ($u) => $u->where('status', 'active')))
            ->whereNotNull('type')
            ->where('type', '!=', '')
            ->distinct()
            ->orderBy('type')
            ->pluck('type');

        return PublicScholarshipResource::collection($scholarships)
            ->additional(['types' => $types, 'audience' => $audience]);
    }
}

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
use App\Services\Search\FuzzySearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
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
    public function __construct(private readonly AudienceResolver $audiences, private readonly FuzzySearch $fuzzy) {}

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

        $buildUniversities = fn (array $terms) => University::query()
            ->where('status', 'active')
            ->with('country:id,name,iso2')
            ->withCount(['programs' => fn ($q) => $q->where('status', 'active')])
            ->when($terms !== [], function ($query) use ($terms) {
                $query->where(function ($outer) use ($terms) {
                    foreach ($terms as $text) {
                        $term = '%'.$text.'%';
                        $outer->orWhere(fn ($q) => $q
                            ->where('name', 'like', $term)
                            ->orWhere('name_zh', 'like', $term)
                            ->orWhere('city', 'like', $term)
                            ->orWhere('province', 'like', $term)
                            // A university also matches when it offers a program with that name (e.g. "MBBS").
                            ->orWhereHas('programs', fn ($p) => $p
                                ->where('status', 'active')
                                ->where('registry_only', false)
                                ->where(fn ($n) => $n->where('name', 'like', $term)->orWhere('name_zh', 'like', $term))));
                    }
                });
            })
            ->when($request->filled('filter.country_id'), fn ($q) => $q->where('country_id', $request->input('filter.country_id')))
            ->when($request->filled('filter.city'), fn ($q) => $q->where('city', $request->input('filter.city')))
            ->when($request->boolean('filter.moe_listed'), fn ($q) => $q->where('moe_listed', true))
            // Universities with a published admission window that has not yet closed.
            ->when($request->boolean('filter.open_intake'), fn ($q) => $q->whereHas('intakes', fn ($i) => $i
                ->where('status', 'open')
                ->where(fn ($d) => $d->whereNull('application_deadline')->orWhere('application_deadline', '>=', now()->toDateString()))))
            ->orderBy('name');

        [$universities, $suggestion] = $this->searchWithSpellingFallback(
            $request,
            'universities',
            $buildUniversities,
            fn () => $this->universityPhrases(),
        );

        // Distinct cities for the directory filter (active universities only).
        $cities = cache()->remember('public.cities.v1', now()->addMinutes(10), fn () => University::query()
            ->where('status', 'active')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->orderBy('city')
            ->pluck('city'));

        $this->attachProgramPreview($universities);

        return PublicUniversityResource::collection($universities)
            ->additional(['cities' => $cities, 'city_stats' => $this->cityStats(), 'audience' => $audience, 'suggestion' => $suggestion]);
    }

    /**
     * What each university card needs to show its programs: how many it has (confirmed for international students, and
     * majors it has registered with the Ministry of Education), and the first few names. One query for the whole list.
     *
     * @param  Collection<int, University>|AbstractPaginator  $universities
     */
    private function attachProgramPreview(Collection|AbstractPaginator $universities): void
    {
        // A paginator hands back its page of models, not its pagination envelope.
        $universities = $universities instanceof AbstractPaginator ? $universities->getCollection() : $universities;
        $ids = $universities->pluck('id')->all();
        if ($ids === []) {
            return;
        }

        $rows = Program::query()
            ->whereIn('university_id', $ids)
            ->where('status', 'active')
            ->orderBy('registry_only')
            ->orderBy('name')
            ->get(['university_id', 'name', 'registry_only'])
            ->groupBy('university_id');

        foreach ($universities as $university) {
            $list = $rows->get($university->id, collect());
            $university->setAttribute('programs_count', $list->count());
            $university->setAttribute('confirmed_programs_count', $list->where('registry_only', false)->count());
            $university->setAttribute('registered_majors_count', $list->where('registry_only', true)->count());
            $university->setAttribute('programs_preview', $list->pluck('name')->unique()->take(4)->values()->all());
        }
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
        return cache()->remember('public.city-stats.v1', now()->addMinutes(10), fn () => $this->buildCityStats());
    }

    private function buildCityStats(): array
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
        $this->attachProgramPreview($inCity);
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
                'programs' => fn ($q) => $q->where('status', 'active')->orderBy('registry_only')->orderBy('name'),
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

        $buildPrograms = fn (array $terms) => Program::query()
            ->where('status', 'active')
            // Majors only registered with the Ministry (no international details yet) show on their university's page, not in the program finder.
            ->when(! $request->filled('filter.university_slug'), fn ($q) => $q->where('registry_only', false))
            ->whereHas('university', fn ($q) => $q->where('status', 'active'))
            ->with('university:id,name,slug,cover_path,cover_credit')
            ->when($terms !== [], fn ($q) => $q->where(function ($outer) use ($terms) {
                foreach ($terms as $text) {
                    $outer->orWhere(fn ($w) => $w->where('name', 'like', '%'.$text.'%')->orWhere('name_zh', 'like', '%'.$text.'%'));
                }
            }))
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
            ->orderBy('name');

        [$programs, $suggestion] = $this->searchWithSpellingFallback($request, 'programs', $buildPrograms, fn () => $this->programPhrases());

        return PublicProgramResource::collection($programs)->additional(['audience' => $audience, 'suggestion' => $suggestion]);
    }

    /**
     * Yearly tuition for English-taught programs, summarised per level from the
     * catalog (only fees the public may see). Nothing here is a CAS price.
     */
    public function costGuide(): JsonResponse
    {
        $data = cache()->remember('public.cost-guide', now()->addHour(), function () {
            $rows = Program::query()
                ->where('status', 'active')
                ->whereHas('university', fn ($q) => $q->where('status', 'active'))
                ->where('teaching_language', 'like', '%English%')
                ->where('currency', 'CNY')
                ->where('tuition_fee', '>', 0)
                ->get(['id', 'name', 'level', 'tuition_fee', 'visibility'])
                ->filter(fn (Program $p) => $p->audienceCanSee('tuition_fee', 'public'));

            $summarise = function ($group) {
                $fees = $group->pluck('tuition_fee')->map(fn ($f) => (float) $f)->sort()->values();
                $n = $fees->count();

                if ($n === 0) {
                    return null;
                }

                $at = fn (float $q) => (int) round($fees[(int) floor(($n - 1) * $q)]);

                return ['programs' => $n, 'low' => $at(0.1), 'median' => $at(0.5), 'high' => $at(0.9)];
            };

            $mbbs = $rows->filter(fn (Program $p) => $p->level === 'bachelor' && preg_match('/MBBS|Clinical Medicine/i', $p->name));

            return [
                'currency' => 'CNY',
                'basis' => 'English-taught programs, yearly tuition, middle 80% of listed fees',
                'levels' => [
                    'bachelor' => $summarise($rows->where('level', 'bachelor')),
                    'master' => $summarise($rows->where('level', 'master')),
                    'phd' => $summarise($rows->where('level', 'phd')),
                    'mbbs' => $summarise($mbbs),
                ],
                'scholarships' => [
                    'government' => Scholarship::where('status', 'active')->where('scope', 'government')->count(),
                    'full' => Scholarship::where('status', 'active')->where('type', 'full')->count(),
                    'partial' => Scholarship::where('status', 'active')->where('type', 'partial')->count(),
                ],
            ];
        });

        return response()->json($data);
    }

    /** Active scholarships across all active universities. */
    public function scholarships(Request $request): AnonymousResourceCollection
    {
        $audience = $this->audience($request);

        $buildScholarships = fn (array $terms) => Scholarship::query()
            ->where('status', 'active')
            ->where(fn ($q) => $q->where('scope', 'government')->orWhereHas('university', fn ($u) => $u->where('status', 'active')))
            ->with('university:id,name,slug,cover_path,cover_credit')
            ->when($terms !== [], function ($query) use ($terms) {
                $query->where(function ($outer) use ($terms) {
                    foreach ($terms as $text) {
                        $term = '%'.$text.'%';
                        $outer->orWhere(fn ($q) => $q->where('name', 'like', $term)->orWhere('type', 'like', $term));
                    }
                });
            })
            ->when($request->filled('filter.type'), fn ($q) => $q->where('type', $request->input('filter.type')))
            ->when($request->filled('filter.university_slug'), fn ($q) => $q->whereHas('university', fn ($uq) => $uq->where('slug', $request->input('filter.university_slug'))))
            ->orderBy('name');

        [$scholarships, $suggestion] = $this->searchWithSpellingFallback($request, 'scholarships', $buildScholarships, fn () => $this->scholarshipPhrases());

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
            ->additional(['types' => $types, 'audience' => $audience, 'suggestion' => $suggestion]);
    }

    /**
     * Runs the search as typed. When it finds nothing, retries with misspelled words corrected to the closest real
     * words on the site ("herbin" finds "Harbin"); the response then says what was searched instead.
     *
     * @param  \Closure(array<int, string>): \Illuminate\Database\Eloquent\Builder<*>  $build  Builds the query for a list of search texts.
     * @param  \Closure(): iterable<string>  $phrases  Every name the search looks at.
     * @return array{0: LengthAwarePaginator<int, *>, 1: array{original: string, query: string}|null}
     */
    private function searchWithSpellingFallback(Request $request, string $domain, \Closure $build, \Closure $phrases): array
    {
        $perPage = min($request->integer('per_page', 24), 50);
        $text = trim($request->string('q')->value());

        $results = $build($text !== '' ? [$text] : [])->paginate($perPage);

        if ($text === '' || $results->total() > 0) {
            return [$results, null];
        }

        $fixed = $this->fuzzy->corrections($domain, $text, $phrases);
        if ($fixed === []) {
            return [$results, null];
        }

        // Best guess first; the next-closest spelling is only tried when the better one finds nothing.
        foreach ($fixed as $spelling) {
            $retry = $build([$spelling])->paginate($perPage);
            if ($retry->total() > 0) {
                return [$retry, ['original' => $text, 'query' => $spelling]];
            }
        }

        return [$results, null];
    }

    /** @return \Generator<int, string> */
    private function universityPhrases(): \Generator
    {
        foreach (University::query()->where('status', 'active')->get(['name', 'city', 'province']) as $u) {
            yield (string) $u->name;
            yield (string) $u->city;
            yield (string) $u->province;
        }

        yield from $this->programPhrases();
    }

    /** @return \Generator<int, string> */
    private function programPhrases(): \Generator
    {
        foreach (Program::query()->where('status', 'active')->where('registry_only', false)->distinct()->pluck('name') as $name) {
            yield (string) $name;
        }
    }

    /** @return \Generator<int, string> */
    private function scholarshipPhrases(): \Generator
    {
        foreach (Scholarship::query()->where('status', 'active')->get(['name', 'type']) as $s) {
            yield (string) $s->name;
            yield (string) $s->type;
        }
    }
}

<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\Public\PublicProgramResource;
use App\Http\Resources\Public\PublicScholarshipResource;
use App\Http\Resources\Public\PublicUniversityResource;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Services\Public\AudienceResolver;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

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
                    ->orWhere('city', 'like', $term));
            })
            ->when($request->filled('filter.country_id'), fn ($q) => $q->where('country_id', $request->input('filter.country_id')))
            ->when($request->filled('filter.city'), fn ($q) => $q->where('city', $request->input('filter.city')))
            ->when($request->boolean('filter.moe_listed'), fn ($q) => $q->where('moe_listed', true))
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
            ->additional(['cities' => $cities, 'audience' => $audience]);
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
                'intakes' => fn ($q) => $q->where('status', 'open')->with('program:id,name')->orderBy('application_deadline'),
                'scholarships' => fn ($q) => $q->where('status', 'active')->orderBy('name'),
            ])
            ->firstOrFail();

        return (new PublicUniversityResource($university))->additional(['audience' => $audience]);
    }

    /**
     * Program finder across all active universities. Filterable by level,
     * teaching language, budget and university; sorted cheapest-first.
     */
    public function programs(Request $request): AnonymousResourceCollection
    {
        $audience = $this->audience($request);

        $programs = Program::query()
            ->where('status', 'active')
            ->whereHas('university', fn ($q) => $q->where('status', 'active'))
            ->with('university:id,name,slug')
            ->when($request->filled('q'), fn ($q) => $q->where('name', 'like', '%'.$request->string('q').'%'))
            ->when($request->filled('filter.level'), fn ($q) => $q->where('level', $request->input('filter.level')))
            ->when($request->filled('filter.language'), fn ($q) => $q->where('teaching_language', 'like', '%'.$request->input('filter.language').'%'))
            ->when($request->filled('filter.max_fee'), fn ($q) => $q->where('tuition_fee', '<=', (float) $request->input('filter.max_fee')))
            ->when($request->filled('filter.university_slug'), fn ($q) => $q->whereHas('university', fn ($uq) => $uq->where('slug', $request->input('filter.university_slug'))))
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
            ->whereHas('university', fn ($q) => $q->where('status', 'active'))
            ->with('university:id,name,slug')
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
            ->whereHas('university', fn ($q) => $q->where('status', 'active'))
            ->whereNotNull('type')
            ->where('type', '!=', '')
            ->distinct()
            ->orderBy('type')
            ->pluck('type');

        return PublicScholarshipResource::collection($scholarships)
            ->additional(['types' => $types, 'audience' => $audience]);
    }
}

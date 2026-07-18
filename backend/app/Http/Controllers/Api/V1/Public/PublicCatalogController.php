<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\Public\PublicProgramResource;
use App\Http\Resources\Public\PublicScholarshipResource;
use App\Http\Resources\Public\PublicUniversityResource;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Unauthenticated read-only catalog for the public website. Only active
 * universities and their active programs / open intakes / active
 * scholarships are exposed; commission agreements and internal data never
 * appear here.
 */
class PublicCatalogController extends Controller
{
    public function universities(Request $request): AnonymousResourceCollection
    {
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
            ->when($request->boolean('filter.moe_listed'), fn ($q) => $q->where('moe_listed', true))
            ->orderBy('name')
            ->paginate(min($request->integer('per_page', 24), 50));

        return PublicUniversityResource::collection($universities);
    }

    public function university(string $slug): PublicUniversityResource
    {
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

        return new PublicUniversityResource($university);
    }

    /**
     * Program finder across all active universities. Filterable by level,
     * teaching language, budget and university; sorted cheapest-first.
     */
    public function programs(Request $request): AnonymousResourceCollection
    {
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

        return PublicProgramResource::collection($programs);
    }

    /** Active scholarships across all active universities. */
    public function scholarships(Request $request): AnonymousResourceCollection
    {
        $scholarships = Scholarship::query()
            ->where('status', 'active')
            ->whereHas('university', fn ($q) => $q->where('status', 'active'))
            ->with('university:id,name,slug')
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('type', 'like', $term));
            })
            ->when($request->filled('filter.university_slug'), fn ($q) => $q->whereHas('university', fn ($uq) => $uq->where('slug', $request->input('filter.university_slug'))))
            ->orderBy('name')
            ->paginate(min($request->integer('per_page', 24), 50));

        return PublicScholarshipResource::collection($scholarships);
    }
}

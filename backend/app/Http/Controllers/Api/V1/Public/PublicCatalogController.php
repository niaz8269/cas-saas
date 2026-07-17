<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\Public\PublicUniversityResource;
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
}

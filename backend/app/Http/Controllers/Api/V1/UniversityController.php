<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreUniversityRequest;
use App\Http\Requests\Catalog\UpdateUniversityRequest;
use App\Http\Resources\UniversityResource;
use App\Models\University;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class UniversityController extends Controller
{
    private const SORTABLE = ['name', 'code', 'city', 'status', 'created_at'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', University::class);

        $sort = (string) $request->input('sort', 'name');
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');

        $universities = University::query()
            ->with('country')
            ->withCount(['courses', 'intakes', 'scholarships', 'agreements'])
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->where('name', 'like', $term)
                    ->orWhere('code', 'like', $term)
                    ->orWhere('city', 'like', $term));
            })
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.country_id'), fn ($q) => $q->where('country_id', $request->input('filter.country_id')))
            ->orderBy(in_array($column, self::SORTABLE, true) ? $column : 'name', $direction)
            ->paginate(min($request->integer('per_page', 25), 100));

        return UniversityResource::collection($universities);
    }

    public function store(StoreUniversityRequest $request): UniversityResource
    {
        $this->authorize('create', University::class);

        $university = University::create($request->validated());

        return new UniversityResource($university->load('country'));
    }

    public function show(University $university): UniversityResource
    {
        $this->authorize('view', $university);

        return new UniversityResource(
            $university->load(['country', 'contacts'])
                ->loadCount(['courses', 'intakes', 'scholarships', 'agreements']),
        );
    }

    public function update(UpdateUniversityRequest $request, University $university): UniversityResource
    {
        $this->authorize('update', $university);

        $university->update($request->validated());

        return new UniversityResource($university->load('country'));
    }

    public function destroy(University $university): Response
    {
        $this->authorize('delete', $university);

        $university->delete(); // soft delete per schema

        return response()->noContent();
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreScholarshipRequest;
use App\Http\Requests\Catalog\UpdateScholarshipRequest;
use App\Http\Resources\ScholarshipResource;
use App\Models\Application;
use App\Models\Scholarship;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ScholarshipController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Scholarship::class);

        $scholarships = Scholarship::query()
            ->with('university:id,name')
            ->when($request->filled('filter.university_id'), fn ($q) => $q->where('university_id', $request->input('filter.university_id')))
            ->when($request->filled('filter.scope'), fn ($q) => $q->where('scope', $request->input('filter.scope')))
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('q'), fn ($q) => $q->where('name', 'like', '%'.$request->string('q').'%'))
            ->orderBy('name')
            ->paginate(min($request->integer('per_page', 25), 100));

        return ScholarshipResource::collection($scholarships);
    }

    public function store(StoreScholarshipRequest $request): ScholarshipResource
    {
        $this->authorize('create', Scholarship::class);

        $data = $request->validated();
        $scholarship = Scholarship::create($data);
        $scholarship->universities()->sync($data['university_ids'] ?? []);

        return new ScholarshipResource($scholarship->load('university:id,name', 'universities:id'));
    }

    public function show(Scholarship $scholarship): ScholarshipResource
    {
        $this->authorize('view', $scholarship);

        return new ScholarshipResource($scholarship->load('university:id,name', 'universities:id'));
    }

    public function update(UpdateScholarshipRequest $request, Scholarship $scholarship): ScholarshipResource
    {
        $this->authorize('update', $scholarship);

        $data = $request->validated();
        $scholarship->update($data);

        if (array_key_exists('university_ids', $data)) {
            $scholarship->universities()->sync($data['university_ids'] ?? []);
        }

        return new ScholarshipResource($scholarship->load('university:id,name', 'universities:id'));
    }

    public function destroy(Scholarship $scholarship): Response
    {
        $this->authorize('delete', $scholarship);

        if (Application::where('scholarship_id', $scholarship->id)->exists()) {
            abort(409, 'Cannot delete a scholarship that has applications. Retire it instead.');
        }

        $scholarship->delete();

        return response()->noContent();
    }
}

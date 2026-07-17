<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreUniversityAgreementRequest;
use App\Http\Requests\Catalog\UpdateUniversityAgreementRequest;
use App\Http\Resources\UniversityAgreementResource;
use App\Models\UniversityAgreement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class UniversityAgreementController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', UniversityAgreement::class);

        $agreements = UniversityAgreement::query()
            ->with('course:id,name')
            ->when($request->filled('filter.university_id'), fn ($q) => $q->where('university_id', $request->input('filter.university_id')))
            ->orderByDesc('valid_from')
            ->paginate(min($request->integer('per_page', 25), 100));

        return UniversityAgreementResource::collection($agreements);
    }

    public function store(StoreUniversityAgreementRequest $request): UniversityAgreementResource
    {
        $this->authorize('create', UniversityAgreement::class);

        return new UniversityAgreementResource(
            UniversityAgreement::create($request->validated())->load('course:id,name'),
        );
    }

    public function show(UniversityAgreement $agreement): UniversityAgreementResource
    {
        $this->authorize('view', $agreement);

        return new UniversityAgreementResource($agreement->load('course:id,name'));
    }

    public function update(UpdateUniversityAgreementRequest $request, UniversityAgreement $agreement): UniversityAgreementResource
    {
        $this->authorize('update', $agreement);

        $agreement->update($request->validated());

        return new UniversityAgreementResource($agreement->load('course:id,name'));
    }

    public function destroy(UniversityAgreement $agreement): Response
    {
        $this->authorize('delete', $agreement);

        $agreement->delete();

        return response()->noContent();
    }
}

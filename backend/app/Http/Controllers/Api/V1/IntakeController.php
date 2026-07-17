<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreIntakeRequest;
use App\Http\Requests\Catalog\UpdateIntakeRequest;
use App\Http\Resources\IntakeResource;
use App\Models\Intake;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class IntakeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Intake::class);

        $intakes = Intake::query()
            ->with('program:id,name,level')
            ->when($request->filled('filter.university_id'), fn ($q) => $q->where('university_id', $request->input('filter.university_id')))
            ->when($request->filled('filter.program_id'), fn ($q) => $q->where('program_id', $request->input('filter.program_id')))
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->orderBy('start_date')
            ->paginate(min($request->integer('per_page', 25), 100));

        return IntakeResource::collection($intakes);
    }

    public function store(StoreIntakeRequest $request): IntakeResource
    {
        $this->authorize('create', Intake::class);

        return new IntakeResource(Intake::create($request->validated())->load('program:id,name,level'));
    }

    public function show(Intake $intake): IntakeResource
    {
        $this->authorize('view', $intake);

        return new IntakeResource($intake->load('program:id,name,level'));
    }

    public function update(UpdateIntakeRequest $request, Intake $intake): IntakeResource
    {
        $this->authorize('update', $intake);

        $intake->update($request->validated());

        return new IntakeResource($intake->load('program:id,name,level'));
    }

    public function destroy(Intake $intake): Response
    {
        $this->authorize('delete', $intake);

        $intake->delete();

        return response()->noContent();
    }
}

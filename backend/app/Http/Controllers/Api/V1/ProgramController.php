<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreProgramRequest;
use App\Http\Requests\Catalog\UpdateProgramRequest;
use App\Http\Resources\ProgramResource;
use App\Models\Application;
use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ProgramController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Program::class);

        $programs = Program::query()
            ->with('university:id,name,code', 'scholarships:id')
            ->when($request->filled('filter.university_id'), fn ($q) => $q->where('university_id', $request->input('filter.university_id')))
            ->when($request->filled('filter.level'), fn ($q) => $q->where('level', $request->input('filter.level')))
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('q'), fn ($q) => $q->where('name', 'like', '%'.$request->string('q').'%'))
            ->orderBy('name')
            ->paginate(min($request->integer('per_page', 25), 100));

        return ProgramResource::collection($programs);
    }

    public function store(StoreProgramRequest $request): ProgramResource
    {
        $this->authorize('create', Program::class);

        $data = $request->validated();
        $program = Program::create($data);
        $program->scholarships()->sync($data['scholarship_ids'] ?? []);

        return new ProgramResource($program->load('university:id,name,code', 'scholarships:id'));
    }

    public function show(Program $program): ProgramResource
    {
        $this->authorize('view', $program);

        return new ProgramResource($program->load('university:id,name,code', 'scholarships:id'));
    }

    public function update(UpdateProgramRequest $request, Program $program): ProgramResource
    {
        $this->authorize('update', $program);

        $data = $request->validated();
        $program->update($data);

        if (array_key_exists('scholarship_ids', $data)) {
            $program->scholarships()->sync($data['scholarship_ids'] ?? []);
        }

        return new ProgramResource($program->load('university:id,name,code', 'scholarships:id'));
    }

    public function destroy(Program $program): Response
    {
        $this->authorize('delete', $program);

        if (Application::where('program_id', $program->id)->exists()) {
            abort(409, 'Cannot delete a program that has applications. Retire it instead.');
        }

        $program->delete();

        return response()->noContent();
    }
}

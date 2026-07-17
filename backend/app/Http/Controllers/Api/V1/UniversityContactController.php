<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreUniversityContactRequest;
use App\Http\Requests\Catalog\UpdateUniversityContactRequest;
use App\Http\Resources\UniversityContactResource;
use App\Models\University;
use App\Models\UniversityContact;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class UniversityContactController extends Controller
{
    public function index(University $university): AnonymousResourceCollection
    {
        $this->authorize('viewAny', UniversityContact::class);

        return UniversityContactResource::collection($university->contacts()->orderBy('name')->get());
    }

    public function store(StoreUniversityContactRequest $request, University $university): UniversityContactResource
    {
        $this->authorize('create', UniversityContact::class);

        return new UniversityContactResource($university->contacts()->create($request->validated()));
    }

    public function update(UpdateUniversityContactRequest $request, UniversityContact $contact): UniversityContactResource
    {
        $this->authorize('update', $contact);

        $contact->update($request->validated());

        return new UniversityContactResource($contact);
    }

    public function destroy(UniversityContact $contact): Response
    {
        $this->authorize('delete', $contact);

        $contact->delete();

        return response()->noContent();
    }
}

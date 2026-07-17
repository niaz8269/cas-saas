<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Comms\SendCommunicationRequest;
use App\Http\Resources\CommunicationResource;
use App\Models\Student;
use App\Services\Comms\CommunicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Outbound communications against a student. Scoped by the student's
 * record visibility — you can only message a student you can see.
 */
class CommunicationController extends Controller
{
    public function index(Request $request, Student $student): AnonymousResourceCollection
    {
        $this->authorize('view', $student);

        $communications = $student->communications()
            ->with(['sender:id,name', 'logs'])
            ->latest('id')
            ->paginate(min($request->integer('per_page', 25), 100));

        return CommunicationResource::collection($communications);
    }

    public function store(
        SendCommunicationRequest $request,
        Student $student,
        CommunicationService $service,
    ): JsonResponse {
        $this->authorize('view', $student);

        // A custom message carries its body at the top level; fold it into
        // the template data bag the renderer reads.
        $data = $request->input('data', []);
        if ($request->filled('body')) {
            $data['body'] = $request->string('body');
        }

        $communication = $service->queue(
            $student,
            $request->string('channel'),
            $request->string('template'),
            $data,
            $request->user()->id,
        );

        return (new CommunicationResource($communication))
            ->response()
            ->setStatusCode(202); // queued
    }
}

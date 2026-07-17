<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\StoreGuardianRequest;
use App\Http\Resources\GuardianResource;
use App\Models\Student;
use App\Models\StudentGuardian;
use Illuminate\Http\JsonResponse;

/**
 * Guardian contacts for a student. Every action is gated on being able to
 * update the parent student (record-scoped), and guardians can only be
 * mutated within their own student.
 */
class GuardianController extends Controller
{
    public function store(StoreGuardianRequest $request, Student $student): GuardianResource
    {
        $this->authorize('update', $student);

        $guardian = $student->guardians()->create($request->validated());

        return new GuardianResource($guardian);
    }

    public function update(StoreGuardianRequest $request, Student $student, StudentGuardian $guardian): GuardianResource
    {
        $this->authorize('update', $student);
        abort_unless($guardian->student_id === $student->id, 404);

        $guardian->update($request->validated());

        return new GuardianResource($guardian);
    }

    public function destroy(Student $student, StudentGuardian $guardian): JsonResponse
    {
        $this->authorize('update', $student);
        abort_unless($guardian->student_id === $student->id, 404);

        $guardian->delete();

        return response()->json(['message' => 'Guardian removed.']);
    }
}

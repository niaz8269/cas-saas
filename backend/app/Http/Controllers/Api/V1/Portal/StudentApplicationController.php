<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Resources\Portal\ApplicantProgramResource;
use App\Models\Program;
use App\Models\Scholarship;
use App\Services\Admissions\ApplicationCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Drives the student self-apply wizard's browsing steps (report §5.11):
 * degree + funding → available programs, and a chosen program → the
 * document checklist. Read-only; the write path lives elsewhere.
 */
class StudentApplicationController extends Controller
{
    public function __construct(private readonly ApplicationCatalog $catalog) {}

    /** Step 1: programs matching the degree tile + funding option. */
    public function availability(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'degree' => ['required', Rule::in(ApplicationCatalog::DEGREES)],
            'funding' => ['required', Rule::in(ApplicationCatalog::FUNDING)],
        ]);

        $programs = $this->catalog->availability($validated['degree'], $validated['funding']);

        return ApplicantProgramResource::collection($programs)->response();
    }

    /** Step 4: the resolved required-document checklist for a program. */
    public function requiredDocuments(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'program_id' => ['required', 'integer', 'exists:programs,id'],
            'scholarship_id' => ['nullable', 'integer', 'exists:scholarships,id'],
        ]);

        $program = Program::findOrFail($validated['program_id']);
        $scholarship = ! empty($validated['scholarship_id'])
            ? Scholarship::find($validated['scholarship_id'])
            : null;

        $documents = $this->catalog->requiredDocuments($program, $scholarship);

        return response()->json([
            'data' => $documents->map(fn ($type) => [
                'id' => $type->id,
                'name' => $type->name,
                'category' => $type->category,
                'is_sensitive' => $type->is_sensitive,
            ])->values(),
        ]);
    }
}

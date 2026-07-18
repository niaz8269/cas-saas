<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Lead;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Cross-entity global search for the topbar. Each entity type is included
 * only when the user can view it, and every query is record-scoped via the
 * model's visibleTo scope — search never widens what a user can see.
 */
class SearchController extends Controller
{
    private const PER_TYPE = 5;

    public function index(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q', ''));

        if (mb_strlen($term) < 2) {
            return response()->json(['data' => []]);
        }

        $user = $request->user();
        $like = '%'.$term.'%';
        $results = [];

        if ($user->can('viewAny', Student::class)) {
            $students = Student::visibleTo($user)
                ->where(fn ($q) => $q
                    ->where('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('passport_no', 'like', $like)
                    ->orWhere('student_code', 'like', $like))
                ->latest()
                ->limit(self::PER_TYPE)
                ->get(['id', 'first_name', 'last_name', 'student_code']);

            foreach ($students as $student) {
                $results[] = [
                    'type' => 'student',
                    'id' => $student->id,
                    'label' => $student->full_name,
                    'sublabel' => $student->student_code,
                ];
            }
        }

        if ($user->can('viewAny', Lead::class)) {
            $leads = Lead::visibleTo($user)
                ->where(fn ($q) => $q
                    ->where('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('phone', 'like', $like))
                ->latest()
                ->limit(self::PER_TYPE)
                ->get(['id', 'first_name', 'last_name', 'email', 'phone']);

            foreach ($leads as $lead) {
                $results[] = [
                    'type' => 'lead',
                    'id' => $lead->id,
                    'label' => $lead->full_name ?: ($lead->email ?? "Lead #{$lead->id}"),
                    'sublabel' => $lead->email ?? $lead->phone,
                ];
            }
        }

        if ($user->can('viewAny', Application::class)) {
            $applications = Application::visibleTo($user)
                ->with(['student:id,first_name,last_name', 'university:id,code'])
                ->where(fn ($q) => $q
                    ->where('application_code', 'like', $like)
                    ->orWhereHas('student', fn ($sq) => $sq
                        ->where('first_name', 'like', $like)
                        ->orWhere('last_name', 'like', $like)
                        ->orWhere('student_code', 'like', $like)))
                ->latest()
                ->limit(self::PER_TYPE)
                ->get(['id', 'application_code', 'student_id', 'university_id']);

            foreach ($applications as $application) {
                $results[] = [
                    'type' => 'application',
                    'id' => $application->id,
                    'label' => $application->application_code,
                    'sublabel' => trim(($application->student?->full_name ?? '').($application->university ? ' · '.$application->university->code : ''), ' ·'),
                ];
            }
        }

        return response()->json(['data' => $results]);
    }
}

<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Models\Communication;
use App\Services\Comms\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * A student's message to the CAS team from inside the portal. It lands on the
 * student's communications timeline (direction "in") and rings the assigned
 * counselor, or the Counselor and Admissions teams when nobody is assigned.
 */
class StudentMessageController extends Controller
{
    public function store(Request $request, NotificationService $notifications): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $student = $request->user();

        $message = Communication::create([
            'student_id' => $student->id,
            'channel' => 'in_app',
            'direction' => 'in',
            'body' => $data['body'],
            'status' => 'received',
        ]);

        $title = "Message from {$student->full_name} ({$student->student_code})";
        $excerpt = mb_strimwidth($data['body'], 0, 140, '...');

        if ($student->assigned_counselor_id) {
            $notifications->push($student->assigned_counselor_id, 'student_message', $title, $excerpt, entityType: 'student', entityId: $student->id);
        } else {
            $notifications->pushToRoles(['Counselor', 'Admissions'], 'student_message', $title, $excerpt, entityType: 'student', entityId: $student->id);
        }

        return response()->json(['data' => ['id' => $message->id]], 201);
    }
}

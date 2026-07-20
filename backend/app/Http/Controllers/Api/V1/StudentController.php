<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\StoreNoteRequest;
use App\Http\Requests\Crm\UpdateStudentRequest;
use App\Http\Resources\ActivityResource;
use App\Http\Resources\StudentResource;
use App\Http\Resources\TaskResource;
use App\Models\Activity;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StudentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Student::class);

        $students = Student::query()
            ->visibleTo($request->user())
            ->with(['country:id,name,iso2', 'branch:id,name,code', 'counselor:id,name', 'agent:id,name,agent_code'])
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
            ->when($request->filled('filter.branch_id'), fn ($q) => $q->where('branch_id', $request->input('filter.branch_id')))
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->where('first_name', 'like', $term)
                    ->orWhere('last_name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('phone', 'like', $term)
                    ->orWhere('passport_no', 'like', $term)
                    ->orWhere('student_code', 'like', $term));
            })
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));

        return StudentResource::collection($students);
    }

    public function show(Request $request, Student $student): StudentResource
    {
        $this->authorize('view', $student);

        return new StudentResource(
            $student->load(['country:id,name,iso2', 'branch:id,name,code', 'counselor:id,name', 'agent:id,name,agent_code', 'guardians']),
        );
    }

    public function update(UpdateStudentRequest $request, Student $student): StudentResource
    {
        $this->authorize('update', $student);

        $student->update([...$request->validated(), 'updated_by' => $request->user()->id]);

        return new StudentResource($student->load(['country:id,name,iso2', 'branch:id,name,code', 'counselor:id,name']));
    }

    /**
     * Full activity timeline, newest first.
     */
    public function timeline(Request $request, Student $student): AnonymousResourceCollection
    {
        $this->authorize('view', $student);

        $activities = $student->activities()
            ->with('user:id,name')
            ->paginate(min($request->integer('per_page', 25), 100));

        return ActivityResource::collection($activities);
    }

    /**
     * All follow-up tasks for this student (any assignee), soonest due first.
     */
    public function tasks(Request $request, Student $student): AnonymousResourceCollection
    {
        $this->authorize('view', $student);

        $tasks = $student->tasks()
            ->with('assignee:id,name')
            ->orderByRaw("case when status in ('open', 'in_progress') then 0 else 1 end") // active first
            ->orderByRaw('due_at is null, due_at asc')
            ->paginate(min($request->integer('per_page', 50), 100));

        return TaskResource::collection($tasks);
    }

    /**
     * Append a note to the timeline.
     */
    public function addNote(StoreNoteRequest $request, Student $student): ActivityResource
    {
        $this->authorize('update', $student);

        $activity = Activity::create([
            'student_id' => $student->id,
            'user_id' => $request->user()->id,
            'type' => 'note',
            'body' => $request->string('body'),
            'created_at' => now(),
        ]);

        return new ActivityResource($activity->load('user:id,name'));
    }
}

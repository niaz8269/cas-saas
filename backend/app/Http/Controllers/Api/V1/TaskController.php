<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tasks\StoreTaskRequest;
use App\Http\Requests\Tasks\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * A staff member's own follow-up tasks (created by lead assignment, conversion,
 * visa workflow, or by hand). Scoped to the current user — you see and manage
 * the tasks assigned to you (or that you created).
 */
class TaskController extends Controller
{
    private const RELATIONS = ['assignee:id,name', 'student:id,first_name,last_name'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $status = $request->input('filter.status', 'active');

        $tasks = Task::query()
            ->where('assignee_id', $request->user()->id)
            ->with(self::RELATIONS)
            ->when($status === 'active', fn ($q) => $q->whereIn('status', ['open', 'in_progress']))
            ->when(in_array($status, ['done', 'open', 'in_progress', 'cancelled'], true), fn ($q) => $q->where('status', $status))
            ->when($request->boolean('filter.overdue'), fn ($q) => $q
                ->whereNotNull('due_at')->where('due_at', '<', now())->whereIn('status', ['open', 'in_progress']))
            ->when($request->filled('q'), fn ($q) => $q->where('title', 'like', '%'.$request->string('q').'%'))
            ->orderByRaw('due_at is null, due_at asc') // soonest due first, undated last
            ->paginate(min($request->integer('per_page', 25), 100));

        return TaskResource::collection($tasks);
    }

    public function store(StoreTaskRequest $request): TaskResource
    {
        $data = $request->validated();

        $task = Task::create([
            ...$data,
            'assignee_id' => $data['assignee_id'] ?? $request->user()->id,
            'priority' => $data['priority'] ?? 'normal',
            'status' => 'open',
            'created_by' => $request->user()->id,
        ]);

        return new TaskResource($task->load(self::RELATIONS));
    }

    public function update(UpdateTaskRequest $request, Task $task): TaskResource
    {
        // You may only change tasks assigned to you or that you created.
        abort_unless(
            $task->assignee_id === $request->user()->id || $task->created_by === $request->user()->id,
            403,
            'This task is not yours to change.',
        );

        $task->update($request->validated());

        return new TaskResource($task->load(self::RELATIONS));
    }
}

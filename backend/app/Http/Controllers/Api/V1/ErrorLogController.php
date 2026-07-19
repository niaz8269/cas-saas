<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ErrorLogResource;
use App\Models\ErrorLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Admin error monitor. Authorization is enforced by the
 * permission:settings.manage.global route middleware.
 */
class ErrorLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $status = $request->input('filter.status', 'unresolved'); // unresolved | resolved | all

        $logs = ErrorLog::query()
            ->when($status === 'unresolved', fn ($q) => $q->whereNull('resolved_at'))
            ->when($status === 'resolved', fn ($q) => $q->whereNotNull('resolved_at'))
            ->when($request->filled('filter.level'), fn ($q) => $q->where('level', $request->input('filter.level')))
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->where('message', 'like', $term)
                    ->orWhere('type', 'like', $term)
                    ->orWhere('url', 'like', $term));
            })
            ->orderByDesc('last_seen_at')
            ->paginate(min($request->integer('per_page', 30), 100));

        return ErrorLogResource::collection($logs)->additional([
            'stats' => [
                'unresolved' => ErrorLog::whereNull('resolved_at')->count(),
                'last_24h' => ErrorLog::where('last_seen_at', '>=', now()->subDay())->count(),
            ],
        ]);
    }

    public function show(ErrorLog $errorLog): ErrorLogResource
    {
        $errorLog->load('resolver:id,name');

        $resource = new ErrorLogResource($errorLog);
        $resource->detail = true;

        return $resource;
    }

    public function resolve(Request $request, ErrorLog $errorLog): ErrorLogResource
    {
        $errorLog->update([
            'resolved_at' => $errorLog->resolved_at ?? now(),
            'resolved_by' => $request->user()->id,
        ]);

        return new ErrorLogResource($errorLog->load('resolver:id,name'));
    }
}

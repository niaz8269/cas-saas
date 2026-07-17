<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    /**
     * Paginated staff directory (User Management module).
     * Route-guarded by permission:users.manage.global.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $users = User::query()
            ->with(['branch:id,name,code', 'department:id,name,code'])
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where(fn ($q) => $q
                    ->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term));
            })
            ->orderBy('name')
            ->paginate(min($request->integer('per_page', 25), 100));

        return UserResource::collection($users);
    }
}

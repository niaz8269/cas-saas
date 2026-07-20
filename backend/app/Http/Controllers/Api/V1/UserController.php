<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    private const SHOW_RELATIONS = ['branch:id,name,code', 'department:id,name,code', 'roles:id,name'];

    /**
     * Paginated staff directory (User Management module).
     * Route-guarded by permission:users.manage.global.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $users = User::query()
            ->with(['branch:id,name,code', 'department:id,name,code', 'roles:id,name'])
            ->when($request->filled('filter.status'), fn ($q) => $q->where('status', $request->input('filter.status')))
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

    public function store(StoreUserRequest $request): UserResource
    {
        $roles = $request->input('roles', []);
        $this->guardRoleAssignment($request->user(), $roles, null);

        $data = $request->safe()->except('roles');
        $data['status'] ??= 'active';

        $user = User::create($data); // password hashed via the model cast
        $user->syncRoles($roles);

        return new UserResource($user->load(self::SHOW_RELATIONS));
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $actor = $request->user();

        // Only a Super Admin may modify a Super Admin account.
        if ($user->hasRole('Super Admin') && ! $actor->hasRole('Super Admin')) {
            abort(403, 'Only a Super Admin can modify a Super Admin account.');
        }

        // Don't let an admin lock themselves out of their own account.
        if ($request->filled('status') && $request->input('status') !== 'active' && $user->is($actor)) {
            throw ValidationException::withMessages([
                'status' => 'You cannot deactivate your own account.',
            ]);
        }

        $roles = $request->has('roles') ? $request->input('roles', []) : null;
        if ($roles !== null) {
            $this->guardRoleAssignment($actor, $roles, $user);
        }

        $data = $request->safe()->except('roles');
        if (empty($data['password'] ?? null)) {
            unset($data['password']); // keep the existing password when none supplied
        }

        $user->update($data);
        if ($roles !== null) {
            $user->syncRoles($roles);
        }

        return new UserResource($user->load(self::SHOW_RELATIONS));
    }

    /**
     * Prevent privilege escalation: only a Super Admin may grant the Super Admin
     * role or touch a user who already holds it. Everyone else (Admin included)
     * is capped below Super Admin.
     *
     * @param  array<int, string>  $roles
     */
    private function guardRoleAssignment(User $actor, array $roles, ?User $target): void
    {
        if ($actor->hasRole('Super Admin')) {
            return;
        }

        if (in_array('Super Admin', $roles, true)) {
            abort(403, 'Only a Super Admin can grant the Super Admin role.');
        }

        if ($target?->hasRole('Super Admin')) {
            abort(403, 'Only a Super Admin can modify a Super Admin account.');
        }
    }
}

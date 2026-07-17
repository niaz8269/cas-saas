<?php

use App\Models\Agent;
use App\Models\Student;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Feature tests boot the framework via Tests\TestCase. Unit tests stay
| plain PHPUnit-style classes and do not need the application.
|
*/

pest()->extend(TestCase::class)->in('Feature');

/*
|--------------------------------------------------------------------------
| Shared helpers
|--------------------------------------------------------------------------
*/

/**
 * Authenticate a staff user holding the given permissions (staff guard).
 *
 * @param  list<string>  $permissions
 * @param  array<string, mixed>  $attributes
 */
function actingAsStaffWith(array $permissions = [], array $attributes = []): User
{
    $user = User::factory()->create($attributes);

    foreach ($permissions as $permission) {
        Permission::findOrCreate($permission, 'staff');
    }

    if ($permissions !== []) {
        $user->givePermissionTo($permissions);
    }

    Sanctum::actingAs($user, guard: 'staff');

    return $user;
}

/**
 * Authenticate an agent on the portal guard (ADR-0004).
 *
 * @param  array<string, mixed>  $attributes
 */
function actingAsAgent(array $attributes = []): Agent
{
    $agent = Agent::factory()->create($attributes);

    Sanctum::actingAs($agent, guard: 'agent');

    return $agent;
}

/**
 * Authenticate a student on the portal guard (ADR-0004).
 *
 * @param  array<string, mixed>  $attributes
 */
function actingAsStudentPortal(array $attributes = []): Student
{
    $student = Student::factory()->create($attributes);

    Sanctum::actingAs($student, guard: 'student');

    return $student;
}

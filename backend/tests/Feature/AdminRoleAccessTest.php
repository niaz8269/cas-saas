<?php

use App\Models\Application;
use App\Models\Lead;
use App\Models\Post;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\Student;
use App\Models\University;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\deleteJson;
use function Pest\Laravel\patchJson;
use function Pest\Laravel\postJson;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $admin = User::factory()->create();
    $admin->assignRole('Admin');
    Sanctum::actingAs($admin, guard: 'staff');
});

// An empty body is rejected with 422 only when the person is allowed to do the thing; a missing right is 403.
it('lets the Admin role create every kind of record', function (string $url) {
    expect(postJson($url, [])->status())->not->toBe(403)->not->toBe(401);
})->with([
    'user' => '/api/v1/users',
    'student' => '/api/v1/students',
    'application' => '/api/v1/applications',
    'university' => '/api/v1/universities',
    'program' => '/api/v1/programs',
    'scholarship' => '/api/v1/scholarships',
    'intake' => '/api/v1/intakes',
    'news, blog or event' => '/api/v1/posts',
]);

it('lets the Admin role edit and delete the catalog, content, students and applications', function () {
    $uni = University::factory()->create();
    $program = Program::factory()->create(['university_id' => $uni->id]);
    $scholarship = Scholarship::factory()->create(['university_id' => $uni->id]);
    $post = Post::factory()->create();
    $student = Student::factory()->create();
    $application = Application::factory()->create();

    foreach ([
        ["/api/v1/universities/{$uni->id}", ['name' => 'Renamed University']],
        ["/api/v1/programs/{$program->id}", ['name' => 'Renamed Program']],
        ["/api/v1/scholarships/{$scholarship->id}", ['name' => 'Renamed Scholarship']],
        ["/api/v1/posts/{$post->id}", ['title' => 'Renamed Post']],
        ["/api/v1/students/{$student->id}", ['first_name' => 'Renamed']],
        ["/api/v1/applications/{$application->id}", ['notes' => 'Edited']],
    ] as [$url, $body]) {
        expect(patchJson($url, $body)->status())->not->toBe(403, "edit {$url}");
    }

    foreach ([
        "/api/v1/programs/{$program->id}", "/api/v1/scholarships/{$scholarship->id}", "/api/v1/posts/{$post->id}",
        "/api/v1/students/{$student->id}", "/api/v1/applications/{$application->id}", "/api/v1/universities/{$uni->id}",
    ] as $url) {
        expect(deleteJson($url)->status())->not->toBe(403, "delete {$url}");
    }
});

it('lets the Admin role edit users but never a Super Admin account', function () {
    $staff = User::factory()->create();
    $super = User::factory()->create();
    $super->assignRole('Super Admin');

    expect(patchJson("/api/v1/users/{$staff->id}", ['name' => 'New Name'])->status())->not->toBe(403)
        ->and(patchJson("/api/v1/users/{$super->id}", ['name' => 'Hijacked'])->status())->toBe(403);
});

it('lets the Admin role delete a user or a lead, but not itself or a Super Admin', function () {
    $staff = User::factory()->create();
    $super = User::factory()->create();
    $super->assignRole('Super Admin');
    $lead = Lead::factory()->create();
    $me = auth('staff')->user() ?? User::query()->role('Admin')->first();

    deleteJson("/api/v1/users/{$staff->id}")->assertOk();
    expect(User::find($staff->id))->toBeNull();

    deleteJson("/api/v1/users/{$super->id}")->assertForbidden();
    deleteJson("/api/v1/users/{$me->id}")->assertUnprocessable();

    deleteJson("/api/v1/leads/{$lead->id}")->assertOk();
    expect(Lead::find($lead->id))->toBeNull();
});

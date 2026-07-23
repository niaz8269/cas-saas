<?php

use App\Models\Lead;
use App\Models\Program;
use App\Models\Student;
use App\Models\University;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

/*
 * RBAC gaps closed against the seeded roles: counselors drive their own
 * caseload's applications, Marketing works the leads it creates, and
 * Finance/Visa can read the catalog their money/visa work references.
 */

beforeEach(fn () => $this->seed(RolesAndPermissionsSeeder::class));

function actingAsRole(string $role): User
{
    $user = User::factory()->create();
    $user->assignRole($role);
    Sanctum::actingAs($user, guard: 'staff');

    return $user;
}

it('lets a counselor create and advance an application for their own student', function () {
    $counselor = actingAsRole('Counselor');
    $university = University::factory()->create();
    $program = Program::factory()->create(['university_id' => $university->id, 'status' => 'active']);
    $mine = Student::factory()->create(['assigned_counselor_id' => $counselor->id]);

    $id = $this->postJson('/api/v1/applications', [
        'student_id' => $mine->id,
        'university_id' => $university->id,
        'program_id' => $program->id,
    ])->assertCreated()->json('data.id');

    $this->postJson("/api/v1/applications/{$id}/transition", ['status' => 'under_review'])
        ->assertOk()
        ->assertJsonPath('data.status', 'under_review');
});

it('stops a counselor from filing for a student outside their caseload', function () {
    actingAsRole('Counselor');
    $university = University::factory()->create();
    $program = Program::factory()->create(['university_id' => $university->id, 'status' => 'active']);
    $notMine = Student::factory()->create(); // no counselor assigned

    $this->postJson('/api/v1/applications', [
        'student_id' => $notMine->id,
        'university_id' => $university->id,
        'program_id' => $program->id,
    ])->assertStatus(422)->assertJsonValidationErrors(['student_id']);
});

it('lets Marketing work (not just create) a lead', function () {
    actingAsRole('Marketing');
    $lead = Lead::factory()->create();

    $this->postJson("/api/v1/leads/{$lead->id}/notes", ['body' => 'Followed up by phone'])
        ->assertSuccessful();
});

it('lets Finance and Visa browse the catalog they reference', function () {
    actingAsRole('Finance');
    $this->getJson('/api/v1/universities')->assertOk();

    actingAsRole('Visa');
    $this->getJson('/api/v1/universities')->assertOk();
});

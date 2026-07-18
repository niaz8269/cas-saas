<?php

use App\Models\Application;
use App\Models\Lead;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('requires authentication', function () {
    $this->getJson('/api/v1/search?q=anything')->assertUnauthorized();
});

it('finds students, leads and applications the user can see', function () {
    actingAsStaffWith(['students.view.global', 'leads.view.global', 'applications.view.global']);

    $student = Student::factory()->create(['first_name' => 'Quark', 'last_name' => 'Star']);
    Lead::factory()->create(['first_name' => 'Quark', 'last_name' => 'Lead']);
    Application::factory()->create(['student_id' => $student->id]);

    $data = collect($this->getJson('/api/v1/search?q=Quark')->assertOk()->json('data'));

    expect($data->where('type', 'student')->count())->toBe(1)
        ->and($data->where('type', 'lead')->count())->toBe(1)
        // the application matches through its student's name
        ->and($data->where('type', 'application')->count())->toBe(1);
});

it('omits entity types the user cannot view', function () {
    actingAsStaffWith(['students.view.global']); // no leads/applications grants

    Student::factory()->create(['first_name' => 'Nova', 'last_name' => 'Ray']);
    Lead::factory()->create(['first_name' => 'Nova', 'last_name' => 'Lead']);

    $data = collect($this->getJson('/api/v1/search?q=Nova')->assertOk()->json('data'));

    expect($data->pluck('type')->unique()->values()->all())->toBe(['student']);
});

it('respects record scope for assigned counselors', function () {
    $counselor = actingAsStaffWith(['students.view.assigned']);
    $mine = Student::factory()->create(['first_name' => 'Orion', 'assigned_counselor_id' => $counselor->id]);
    Student::factory()->create(['first_name' => 'Orion', 'assigned_counselor_id' => null]);

    $data = collect($this->getJson('/api/v1/search?q=Orion')->assertOk()->json('data'));

    expect($data)->toHaveCount(1)
        ->and($data->first()['id'])->toBe($mine->id);
});

it('returns nothing for a term shorter than two characters', function () {
    actingAsStaffWith(['students.view.global']);
    Student::factory()->create(['first_name' => 'Ax']);

    $this->getJson('/api/v1/search?q=A')->assertOk()->assertExactJson(['data' => []]);
});

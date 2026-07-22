<?php

use App\Models\Application;
use App\Models\Program;
use App\Models\Student;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
 * The agent "apply on behalf" wizard reuses the shared apply flow
 * ({@see App\Http\Controllers\Api\V1\Portal\Concerns\HandlesPortalApplications}
 * + ApplicationCatalog), so a per-university application form drives the agent
 * wizard exactly like the student one. draftPayload() lives in
 * StudentApplicationSubmitTest.
 */

/** A university whose application form has one required radio field, + a program. */
function agentFormUniversity(): array
{
    $uni = University::factory()->create([
        'status' => 'active',
        'application_form' => ['fields' => [
            ['key' => 'preferred_major', 'label' => 'Preferred major', 'type' => 'radio', 'required' => true, 'options' => ['Medicine', 'Engineering']],
        ]],
    ]);
    $program = Program::factory()->create([
        'university_id' => $uni->id, 'name' => 'MBBS', 'level' => 'bachelor', 'status' => 'active',
    ]);

    return [$uni, $program];
}

it('exposes the university application form to the agent wizard', function () {
    actingAsAgent();
    agentFormUniversity();

    $this->getJson('/api/v1/agent/applications/availability?degree=mbbs&funding=self')
        ->assertOk()
        ->assertJsonPath('data.0.custom_fields.0.key', 'preferred_major')
        ->assertJsonPath('data.0.custom_fields.0.type', 'radio');
});

it('validates the agent answers against the university form', function () {
    $agent = actingAsAgent();
    $student = Student::factory()->create(['agent_id' => $agent->id]);
    [, $program] = agentFormUniversity();

    $this->postJson('/api/v1/agent/applications', [
        'student_id' => $student->id,
        ...draftPayload($program),
        'custom_fields' => ['preferred_major' => 'Law'], // not an option
    ])->assertStatus(422)->assertJsonValidationErrors('custom_fields.preferred_major');

    $this->postJson('/api/v1/agent/applications', [
        'student_id' => $student->id,
        ...draftPayload($program),
        'custom_fields' => ['preferred_major' => 'Medicine'],
    ])->assertCreated();

    expect(Application::firstOrFail()->custom_fields)->toBe(['preferred_major' => 'Medicine']);
});

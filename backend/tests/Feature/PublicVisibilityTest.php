<?php

use App\Models\Agent;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\Student;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
 * Phase 2 (ADR-0015): admin-configurable field × audience visibility overrides
 * the Phase-1 default. A record's `visibility` map says, per gateable section,
 * which audiences may see it. Unknown sections/audiences are dropped on save.
 */

function visProgram(array $visibility = []): Program
{
    $university = University::factory()->create(['status' => 'active']);

    return Program::factory()->create([
        'university_id' => $university->id, 'status' => 'active',
        'tuition_fee' => 20000, 'currency' => 'CNY',
        'service_charges' => ['currency' => 'USD', 'self' => ['student' => 500, 'agent' => 300]],
        'visibility' => $visibility,
    ]);
}

function tokenFor(object $user): string
{
    return $user->createToken('test')->plainTextToken;
}

it('sanitises visibility on save — drops unknown sections and audiences', function () {
    $program = visProgram(['fee' => ['public', 'bogus-audience'], 'unknown_section' => ['student']]);

    expect($program->fresh()->visibility)->toBe(['fee' => ['public']]);
});

it('honours a config that opens the fee to the public', function () {
    visProgram(['fee' => ['public', 'student', 'agent', 'counselor']]);

    $res = $this->getJson('/api/v1/public/programs')->assertOk();

    expect($res->json('data.0.fee_locked'))->toBeFalse()
        ->and($res->json('data.0.tuition_fee'))->not->toBeNull();
});

it('honours an agent-only fee config', function () {
    visProgram(['fee' => ['agent']]);

    // Student is now excluded even though logged in.
    $studentRes = $this->withToken(tokenFor(Student::factory()->create()))->getJson('/api/v1/public/programs')->assertOk();
    expect($studentRes->json('data.0.fee_locked'))->toBeTrue()
        ->and($studentRes->json('data.0.tuition_fee'))->toBeNull();

    // Agent sees it.
    $agentRes = $this->withToken(tokenFor(Agent::factory()->create()))->getJson('/api/v1/public/programs')->assertOk();
    expect($agentRes->json('data.0.fee_locked'))->toBeFalse();
});

it('falls back to the registered-only default when a section is unconfigured', function () {
    visProgram([]); // no config

    expect($this->getJson('/api/v1/public/programs')->assertOk()->json('data.0.fee_locked'))->toBeTrue();
    expect($this->withToken(tokenFor(Student::factory()->create()))->getJson('/api/v1/public/programs')->assertOk()->json('data.0.fee_locked'))->toBeFalse();
});

it('opens a scholarship amount to the public when configured', function () {
    $university = University::factory()->create(['status' => 'active']);
    Scholarship::factory()->create([
        'university_id' => $university->id, 'status' => 'active', 'amount' => 9000,
        'visibility' => ['amount' => ['public', 'student', 'agent', 'counselor']],
    ]);

    expect($this->getJson('/api/v1/public/scholarships')->assertOk()->json('data.0.amount'))->not->toBeNull();
});

it('persists visibility set through the admin program endpoint', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $program = visProgram([]);

    $this->patchJson("/api/v1/programs/{$program->id}", ['visibility' => ['fee' => ['public', 'student']]])
        ->assertOk()
        ->assertJsonPath('data.visibility.fee', ['public', 'student']);

    expect($program->fresh()->visibility)->toBe(['fee' => ['public', 'student']]);
});

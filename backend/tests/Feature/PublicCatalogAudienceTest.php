<?php

use App\Models\Agent;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\Student;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
 * The public catalog is audience-aware (Phase 1): guests get basics with the
 * money/deadline specifics gated; a logged-in student/agent/staff token widens
 * the view and the program fee shows the viewer's service-charge rate.
 */

function activeProgram(): Program
{
    $university = University::factory()->create(['status' => 'active']);

    return Program::factory()->create([
        'university_id' => $university->id,
        'status' => 'active',
        'tuition_fee' => 20000,
        'currency' => 'CNY',
        'service_charges' => ['currency' => 'USD', 'self' => ['student' => 500, 'agent' => 300]],
    ]);
}

function bearer(object $user): string
{
    return $user->createToken('test')->plainTextToken;
}

it('hides program fees from guests', function () {
    activeProgram();

    $res = $this->getJson('/api/v1/public/programs')->assertOk();

    expect($res->json('audience'))->toBe('public')
        ->and($res->json('data.0.fee_locked'))->toBeTrue()
        ->and($res->json('data.0.tuition_fee'))->toBeNull()
        ->and($res->json('data.0.service_charge'))->toBeNull();
});

it('reveals fees and the student rate to a logged-in student', function () {
    activeProgram();
    $token = bearer(Student::factory()->create());

    $res = $this->withToken($token)->getJson('/api/v1/public/programs')->assertOk();

    expect($res->json('audience'))->toBe('student')
        ->and($res->json('data.0.fee_locked'))->toBeFalse()
        ->and($res->json('data.0.tuition_fee'))->not->toBeNull()
        ->and($res->json('data.0.service_charge.amount'))->toEqual(500);
});

it('shows the agent rate to a logged-in agent', function () {
    activeProgram();
    $token = bearer(Agent::factory()->create());

    $res = $this->withToken($token)->getJson('/api/v1/public/programs')->assertOk();

    expect($res->json('audience'))->toBe('agent')
        ->and($res->json('data.0.service_charge.amount'))->toEqual(300);
});

it('gates scholarship amount + deadline from guests but not from a student', function () {
    $university = University::factory()->create(['status' => 'active']);
    Scholarship::factory()->create(['university_id' => $university->id, 'status' => 'active', 'amount' => 9000]);

    expect($this->getJson('/api/v1/public/scholarships')->assertOk()->json('data.0'))
        ->toMatchArray(['details_locked' => true, 'amount' => null]);

    $token = bearer(Student::factory()->create());
    expect($this->withToken($token)->getJson('/api/v1/public/scholarships')->assertOk()->json('data.0.amount'))
        ->not->toBeNull();
});

it('gates intake deadlines on the university detail for guests', function () {
    $program = activeProgram();
    $slug = $program->university->slug;
    $program->university->intakes()->create([
        'program_id' => $program->id, 'name' => 'Sep 2026', 'status' => 'open',
        'application_deadline' => '2026-06-01',
    ]);

    $guest = $this->getJson("/api/v1/public/universities/{$slug}")->assertOk();
    expect($guest->json('data.deadlines_locked'))->toBeTrue()
        ->and($guest->json('data.intakes'))->toBe([]);

    $token = bearer(Student::factory()->create());
    $member = $this->withToken($token)->getJson("/api/v1/public/universities/{$slug}")->assertOk();
    expect($member->json('data.deadlines_locked'))->toBeFalse()
        ->and($member->json('data.intakes'))->toHaveCount(1);
});

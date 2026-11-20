<?php

use App\Models\Program;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

function finderProgram(University $u, string $name, array $over = []): Program
{
    return Program::factory()->create(array_merge(['university_id' => $u->id, 'name' => $name, 'level' => 'bachelor', 'status' => 'active', 'registry_only' => false, 'currency' => 'CNY', 'tuition_fee' => 20000, 'duration_months' => 48, 'csc_listed' => false], $over));
}

it('filters programs by city and CSC listing and sorts them', function () {
    $beijing = University::factory()->create(['status' => 'active', 'city' => 'Beijing', 'province' => 'Beijing']);
    $wuhan = University::factory()->create(['status' => 'active', 'city' => 'Wuhan', 'province' => 'Hubei']);
    finderProgram($beijing, 'Cheap Course', ['tuition_fee' => 10000, 'csc_listed' => true, 'duration_months' => 60]);
    finderProgram($beijing, 'Dear Course', ['tuition_fee' => 50000, 'duration_months' => 24]);
    finderProgram($wuhan, 'Wuhan Course', ['tuition_fee' => 30000]);

    $names = fn (string $qs) => collect(getJson('/api/v1/public/programs?'.$qs)->assertOk()->json('data'))->pluck('name')->all();

    expect($names('filter[city]=Wuhan'))->toBe(['Wuhan Course'])
        ->and($names('filter[province]=Hubei'))->toBe(['Wuhan Course'])
        ->and($names('filter[csc]=1'))->toBe(['Cheap Course'])
        ->and($names('sort=fee'))->toBe(['Cheap Course', 'Wuhan Course', 'Dear Course'])
        ->and($names('sort=fee_desc'))->toBe(['Dear Course', 'Wuhan Course', 'Cheap Course'])
        ->and($names('sort=duration'))->toBe(['Dear Course', 'Wuhan Course', 'Cheap Course'])
        ->and(getJson('/api/v1/public/programs?filter[city]=Wuhan')->json('data.0.university.city'))->toBe('Wuhan');
});

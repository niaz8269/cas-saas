<?php

use App\Models\Program;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->confirmed = University::factory()->create(['name' => 'Beijing Normal University', 'slug' => 'beijing-normal', 'city' => 'Beijing', 'status' => 'active']);
    Program::factory()->create(['university_id' => $this->confirmed->id, 'name' => 'Civil Engineering', 'registry_only' => false, 'status' => 'active']);
    foreach (['Applied Physics', 'Botany', 'Chemistry', 'Data Science', 'Education'] as $name) {
        Program::factory()->create(['university_id' => $this->confirmed->id, 'name' => $name, 'registry_only' => true, 'status' => 'active']);
    }
    Program::factory()->create(['university_id' => $this->confirmed->id, 'name' => 'Hidden draft', 'registry_only' => false, 'status' => 'inactive']);

    $this->registered = University::factory()->create(['name' => 'Beijing Arts College', 'slug' => 'beijing-arts', 'city' => 'Beijing', 'status' => 'active']);
    Program::factory()->create(['university_id' => $this->registered->id, 'name' => 'Painting', 'registry_only' => true, 'status' => 'active']);

    $this->empty = University::factory()->create(['name' => 'Beijing Empty Institute', 'slug' => 'beijing-empty', 'city' => 'Beijing', 'status' => 'active']);
});

it('gives every university on a city page its program count and first program names', function () {
    $rows = collect(getJson('/api/v1/public/cities/beijing')->assertOk()->json('universities'))->keyBy('slug');

    expect($rows['beijing-normal']['programs_count'])->toBe(6)
        ->and($rows['beijing-normal']['confirmed_programs_count'])->toBe(1)
        ->and($rows['beijing-normal']['registered_majors_count'])->toBe(5)
        // Programs with details for international students come first, then the registered majors by name.
        ->and($rows['beijing-normal']['programs_preview'])->toBe(['Civil Engineering', 'Applied Physics', 'Botany', 'Chemistry'])
        ->and($rows['beijing-arts']['programs_preview'])->toBe(['Painting']);
});

it('says plainly when a university has no program listed, instead of showing nothing', function () {
    $row = collect(getJson('/api/v1/public/cities/beijing')->json('universities'))->firstWhere('slug', 'beijing-empty');

    expect($row['programs_count'])->toBe(0)->and($row['programs_preview'])->toBe([])->and($row['confirmed_programs_count'])->toBe(0);
});

it('gives the same program details on the universities list', function () {
    $row = collect(getJson('/api/v1/public/universities?q=Normal')->assertOk()->json('data'))->firstWhere('slug', 'beijing-normal');

    expect($row['programs_count'])->toBe(6)->and($row['programs_preview'])->toHaveCount(4)->and($row['registered_majors_count'])->toBe(5);
});

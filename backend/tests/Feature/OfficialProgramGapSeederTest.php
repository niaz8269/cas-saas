<?php

use App\Models\Program;
use App\Models\University;
use Database\Seeders\OfficialProgramGapSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('adds sourced programs to listed universities and is idempotent', function () {
    $u = University::factory()->create(['name' => 'Renmin University of China']);

    $this->seed(OfficialProgramGapSeeder::class);
    $this->seed(OfficialProgramGapSeeder::class);

    $programs = Program::where('university_id', $u->id)->get();
    expect($programs)->toHaveCount(1)
        ->and($programs->first()->source_url)->not->toBeNull()
        ->and($programs->first()->verified_on)->not->toBeNull()
        ->and($programs->first()->teaching_language)->toBe('English');
});

it('skips universities that are not in the catalog', function () {
    $this->seed(OfficialProgramGapSeeder::class);

    expect(Program::count())->toBe(0);
});

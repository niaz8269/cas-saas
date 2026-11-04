<?php

use App\Models\Program;
use App\Models\University;
use Database\Seeders\MbbsProgramGapSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('adds an English MBBS program to MoE-listed universities that lack one', function () {
    $gap = University::factory()->create(['moe_listed' => true]);
    $covered = University::factory()->create(['moe_listed' => true]);
    Program::factory()->create(['university_id' => $covered->id, 'name' => 'Clinical Medicine (MBBS)', 'level' => 'bachelor', 'teaching_language' => 'English', 'tuition_fee' => 30000]);
    $other = University::factory()->create(['moe_listed' => false]);

    $this->seed(MbbsProgramGapSeeder::class);

    $added = Program::where('university_id', $gap->id)->get();
    expect($added)->toHaveCount(1)
        ->and($added->first()->name)->toBe('Clinical Medicine (MBBS)')
        ->and($added->first()->duration_months)->toBe(72)
        ->and($added->first()->tuition_fee)->toBeNull()
        ->and($added->first()->audienceCanSee('tuition_fee', 'public'))->toBeTrue()
        ->and(Program::where('university_id', $covered->id)->count())->toBe(1)
        ->and(Program::where('university_id', $other->id)->count())->toBe(0);
});

it('is idempotent', function () {
    University::factory()->create(['moe_listed' => true]);

    $this->seed(MbbsProgramGapSeeder::class);
    $this->seed(MbbsProgramGapSeeder::class);

    expect(Program::count())->toBe(1);
});

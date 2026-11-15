<?php

use App\Models\Intake;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

it('gives each card the real closing date of its nearest open window, and nothing when there is none', function () {
    $withWindow = University::factory()->create(['slug' => 'with-window', 'status' => 'active']);
    Intake::factory()->create(['university_id' => $withWindow->id, 'status' => 'open', 'application_deadline' => now()->addDays(40)->toDateString()]);
    Intake::factory()->create(['university_id' => $withWindow->id, 'status' => 'open', 'application_deadline' => now()->addDays(20)->toDateString()]);
    Intake::factory()->create(['university_id' => $withWindow->id, 'status' => 'open', 'application_deadline' => now()->subDays(5)->toDateString()]);
    University::factory()->create(['slug' => 'no-window', 'status' => 'active']);

    $rows = collect(getJson('/api/v1/public/universities')->assertOk()->json('data'))->keyBy('slug');

    expect($rows['with-window']['open_deadline'])->toBe(now()->addDays(20)->toDateString())
        ->and($rows['no-window']['open_deadline'])->toBeNull();
});

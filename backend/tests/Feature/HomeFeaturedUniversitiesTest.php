<?php

use App\Models\Intake;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

it('lists only the universities chosen for the home page, in the chosen order', function () {
    University::factory()->create(['name' => 'Aba University', 'slug' => 'aba', 'status' => 'active']);
    University::factory()->create(['name' => 'Zhejiang University', 'slug' => 'zju', 'status' => 'active', 'home_rank' => 1]);
    University::factory()->create(['name' => 'Fudan University', 'slug' => 'fudan', 'status' => 'active', 'home_rank' => 2]);
    University::factory()->create(['name' => 'Hidden University', 'slug' => 'hidden', 'status' => 'inactive', 'home_rank' => 3]);

    $slugs = collect(getJson('/api/v1/public/universities?filter[featured]=1')->assertOk()->json('data'))->pluck('slug')->all();

    expect($slugs)->toBe(['zju', 'fudan']);
});

it('lets staff set and clear a university\'s home page position', function () {
    actingAsStaffWith(['universities.view.global', 'universities.manage.global']);
    $uni = University::factory()->create();

    $this->putJson("/api/v1/universities/{$uni->id}", ['home_rank' => 2])->assertOk()->assertJsonPath('data.home_rank', 2);
    $this->putJson("/api/v1/universities/{$uni->id}", ['home_rank' => null])->assertOk()->assertJsonPath('data.home_rank', null);
    $this->putJson("/api/v1/universities/{$uni->id}", ['home_rank' => 0])->assertUnprocessable();
});

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

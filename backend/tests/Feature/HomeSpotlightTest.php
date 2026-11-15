<?php

use App\Models\Post;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\getJson;
use function Pest\Laravel\putJson;

uses(RefreshDatabase::class);

const SPOTLIGHT_STAFF = ['content.view.global', 'content.manage.global'];

it('keeps the order staff chose and serves it publicly as ids', function () {
    actingAsStaffWith(SPOTLIGHT_STAFF);
    $a = University::factory()->create(['status' => 'active']);
    $b = University::factory()->create(['status' => 'active']);
    $c = University::factory()->create(['status' => 'active']);

    putJson('/api/v1/home-spotlight', ['lists' => ['hero_universities' => [$c->id, $a->id, $b->id]]])
        ->assertOk()
        ->assertJsonPath('data.hero_universities.0.id', $c->id)
        ->assertJsonPath('data.hero_universities.2.id', $b->id);

    getJson('/api/v1/public/home-spotlight')->assertOk()
        ->assertJsonPath('data.hero_universities', [$c->id, $a->id, $b->id])
        ->assertJsonPath('data.update_programs', []);

    // Reordering replaces the old order; an empty list goes back to automatic.
    putJson('/api/v1/home-spotlight', ['lists' => ['hero_universities' => [$b->id], 'update_programs' => []]])->assertOk();
    getJson('/api/v1/public/home-spotlight')->assertJsonPath('data.hero_universities', [$b->id]);
});

it('limits how many items a list can hold and rejects unknown lists and missing items', function () {
    actingAsStaffWith(SPOTLIGHT_STAFF);
    $ids = University::factory()->count(4)->create(['status' => 'active'])->pluck('id')->all();

    putJson('/api/v1/home-spotlight', ['lists' => ['hero_universities' => $ids]])->assertUnprocessable();
    putJson('/api/v1/home-spotlight', ['lists' => ['nope' => [1]]])->assertUnprocessable();
    putJson('/api/v1/home-spotlight', ['lists' => ['hero_universities' => [999999]]])->assertUnprocessable();
});

it('lets only staff with content permission change it', function () {
    actingAsStaffWith(['content.view.global']);

    putJson('/api/v1/home-spotlight', ['lists' => ['hero_universities' => []]])->assertForbidden();
});

it('searches what a list can take', function () {
    actingAsStaffWith(SPOTLIGHT_STAFF);
    University::factory()->create(['name' => 'Zhejiang University', 'status' => 'active']);
    University::factory()->create(['name' => 'Fudan University', 'status' => 'active']);

    $rows = getJson('/api/v1/home-spotlight/options/hero_universities?q=zhej')->assertOk()->json('data');

    expect($rows)->toHaveCount(1)->and($rows[0]['label'])->toBe('Zhejiang University');
});

it('loads universities, programs, scholarships and stories by id, in the chosen order', function () {
    $u = University::factory()->count(3)->create(['status' => 'active']);
    $p = Program::factory()->count(3)->create(['status' => 'active', 'registry_only' => false, 'university_id' => $u[0]->id]);
    $s = Scholarship::factory()->count(3)->create(['status' => 'active', 'university_id' => $u[0]->id]);
    $posts = Post::factory()->count(3)->create(['status' => 'published', 'published_at' => now()->subDay()]);

    $order = fn ($models) => $models->pluck('id')->reverse()->values()->all();

    expect(collect(getJson('/api/v1/public/universities?filter[ids]='.implode(',', $order($u)))->json('data'))->pluck('id')->all())->toBe($order($u))
        ->and(collect(getJson('/api/v1/public/programs?filter[ids]='.implode(',', $order($p)))->json('data'))->pluck('id')->all())->toBe($order($p))
        ->and(collect(getJson('/api/v1/public/scholarships?filter[ids]='.implode(',', $order($s)))->json('data'))->pluck('id')->all())->toBe($order($s))
        ->and(collect(getJson('/api/v1/public/posts?ids='.implode(',', $order($posts)))->json('data'))->pluck('id')->all())->toBe($order($posts));
});

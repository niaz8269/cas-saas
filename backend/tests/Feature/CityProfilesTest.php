<?php

use App\Models\CityProfile;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

it('filters the university list by province and lists the provinces', function () {
    University::factory()->create(['slug' => 'a', 'status' => 'active', 'city' => 'Hangzhou', 'province' => 'Zhejiang']);
    University::factory()->create(['slug' => 'b', 'status' => 'active', 'city' => 'Ningbo', 'province' => 'Zhejiang']);
    University::factory()->create(['slug' => 'c', 'status' => 'active', 'city' => 'Xi\'an', 'province' => 'Shaanxi']);

    $res = getJson('/api/v1/public/universities?filter[province]=Zhejiang&include=lists')->assertOk();

    expect(collect($res->json('data'))->pluck('slug')->sort()->values()->all())->toBe(['a', 'b'])
        ->and($res->json('provinces'))->toBe(['Shaanxi', 'Zhejiang'])
        ->and($res->json('cities'))->toBe(['Hangzhou', 'Ningbo']);
});

it('gives a city page its profile when one has been built', function () {
    University::factory()->create(['slug' => 'zju', 'status' => 'active', 'city' => 'Hangzhou', 'province' => 'Zhejiang']);
    CityProfile::create([
        'slug' => 'hangzhou', 'city' => 'Hangzhou', 'summary' => 'Capital of Zhejiang.',
        'sections' => [['group' => 'places', 'h' => 'Sights', 'level' => 2, 'blocks' => [['t' => 'p', 'x' => 'West Lake.']]]],
        'source_url' => 'https://en.wikipedia.org/wiki/Hangzhou',
    ]);

    $res = getJson('/api/v1/public/cities/hangzhou')->assertOk();

    expect($res->json('profile.summary'))->toBe('Capital of Zhejiang.')
        ->and($res->json('profile.sections.0.group'))->toBe('places')
        ->and($res->json('universities'))->toHaveCount(1);
});

it('has no profile for a city that has none built, and does not invent one', function () {
    University::factory()->create(['slug' => 'x', 'status' => 'active', 'city' => 'Aba', 'province' => 'Sichuan']);

    getJson('/api/v1/public/cities/aba')->assertOk()->assertJsonPath('profile', null);
});

it('builds a city profile from its Wikipedia article, keeping history and places and skipping references', function () {
    University::factory()->create(['slug' => 'zju', 'status' => 'active', 'city' => 'Hangzhou', 'province' => 'Zhejiang']);
    University::factory()->create(['slug' => 'gone', 'status' => 'active', 'city' => 'Nowhereville', 'province' => 'X']);

    $article = "Hangzhou is the capital of Zhejiang.\n\nIt sits on the Qiantang River.\n\n== History ==\nSettled for thousands of years.\n\n== Tourism ==\nWest Lake is a UNESCO World Heritage Site.\n\n=== Temples ===\nLingyin Temple\n\n== Education and research ==\nMany universities are here.\n\n== References ==\nSome citation text.";
    Http::fake(function ($request) use ($article) {
        $title = $request['titles'];

        return Http::response(['query' => ['pages' => ['1' => ['extract' => $title === 'Hangzhou' ? $article : '']]]]);
    });

    $this->artisan('catalog:build-city-profiles')->assertSuccessful();

    $profile = CityProfile::where('slug', 'hangzhou')->first();
    expect($profile->summary)->toContain('capital of Zhejiang')
        ->and(collect($profile->sections)->pluck('group')->all())->toBe(['history', 'places', 'places', 'education'])
        ->and(collect($profile->sections)->pluck('h')->contains('References'))->toBeFalse()
        ->and($profile->source_url)->toBe('https://en.wikipedia.org/wiki/Hangzhou')
        ->and(CityProfile::where('slug', 'nowhereville')->exists())->toBeFalse();
});

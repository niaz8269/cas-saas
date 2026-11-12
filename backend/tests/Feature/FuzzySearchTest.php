<?php

use App\Models\Post;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Services\Search\FuzzySearch;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->harbin = University::factory()->create(['name' => 'Harbin Medical University', 'slug' => 'harbin-medical-university', 'city' => 'Harbin', 'province' => 'Heilongjiang', 'status' => 'active']);
    University::factory()->create(['name' => 'Beijing Normal University', 'slug' => 'beijing-normal-university', 'city' => 'Beijing', 'province' => 'Beijing', 'status' => 'active']);
    Program::factory()->create(['university_id' => $this->harbin->id, 'name' => 'Civil Engineering', 'level' => 'bachelor', 'registry_only' => false, 'status' => 'active']);
});

it('finds a university when the city is misspelled and says what it searched for', function () {
    $response = getJson('/api/v1/public/universities?q=herbin')->assertOk();

    expect(collect($response->json('data'))->pluck('name')->all())->toBe(['Harbin Medical University'])
        ->and($response->json('suggestion'))->toBe(['original' => 'herbin', 'query' => 'harbin']);
});

it('corrects swapped letters, a missing letter and a wrong letter', function (string $typed) {
    $names = collect(getJson('/api/v1/public/universities?q='.$typed)->assertOk()->json('data'))->pluck('name')->all();

    expect($names)->toContain('Harbin Medical University');
})->with(['hrabin', 'harbn', 'harbine', 'herbin medical']);

it('does not touch a search that already finds something, or a word still being typed', function () {
    expect(getJson('/api/v1/public/universities?q=harbin')->json('suggestion'))->toBeNull();

    $partial = getJson('/api/v1/public/universities?q=harb')->assertOk();
    expect(collect($partial->json('data'))->pluck('name')->all())->toBe(['Harbin Medical University'])
        ->and($partial->json('suggestion'))->toBeNull();
});

it('returns nothing, and no suggestion, when no real word is close', function () {
    $response = getJson('/api/v1/public/universities?q=zzqqxxww')->assertOk();

    expect($response->json('data'))->toBe([])->and($response->json('suggestion'))->toBeNull();
});

it('finds programs, scholarships and news despite typing mistakes', function () {
    $programs = getJson('/api/v1/public/programs?q=enginering')->assertOk();
    expect(collect($programs->json('data'))->pluck('name')->all())->toContain('Civil Engineering')
        ->and($programs->json('suggestion.query'))->toBe('engineering');

    Scholarship::factory()->create(['name' => 'Chinese Government Scholarship', 'scope' => 'government', 'university_id' => null, 'status' => 'active']);
    $scholarships = getJson('/api/v1/public/scholarships?q=scholership')->assertOk();
    expect(collect($scholarships->json('data'))->pluck('name')->all())->toContain('Chinese Government Scholarship')
        ->and($scholarships->json('suggestion.query'))->toBe('scholarship');

    Post::factory()->create(['title' => 'Application windows open for spring intake', 'slug' => 'spring-intake', 'status' => 'published', 'published_at' => now()]);
    $posts = getJson('/api/v1/public/posts?q=aplication')->assertOk();
    expect(collect($posts->json('data'))->pluck('title')->all())->toContain('Application windows open for spring intake')
        ->and($posts->json('suggestion.query'))->toBe('application');
});

it('returns the closest real words first, never inventing a word', function () {
    $fuzzy = new FuzzySearch;
    $phrases = fn () => ['Harbin Medical University', 'Beijing Normal University', 'Harbin Institute of Technology'];

    expect($fuzzy->corrections('t1', 'herbin', $phrases))->toBe(['harbin'])
        ->and($fuzzy->corrections('t1', 'beijng normal', $phrases))->toBe(['beijing normal'])
        ->and($fuzzy->corrections('t1', 'harbin', $phrases))->toBe([])
        ->and($fuzzy->corrections('t1', 'qwertyuiop', $phrases))->toBe([])
        ->and($fuzzy->corrections('t1', 'ab', $phrases))->toBe([]);
});

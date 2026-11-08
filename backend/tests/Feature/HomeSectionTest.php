<?php

use App\Models\HomeSection;
use Database\Seeders\HomeSectionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn () => (new HomeSectionSeeder)->run());

function section(string $key): HomeSection
{
    return HomeSection::where('key', $key)->firstOrFail();
}

function manager(): void
{
    actingAsStaffWith(['content.view.global', 'content.manage.global']);
}

it('seeds the standard sections in order, once', function () {
    (new HomeSectionSeeder)->run();

    expect(HomeSection::orderBy('sort_order')->pluck('key')->all())->toBe(['hero', 'cities', 'weekly', 'highlights', 'outstanding', 'featured', 'more', 'testimonials', 'share', 'cta', 'why']);
});

it('serves the visible sections in order to the public, with only what was changed', function () {
    section('cities')->update(['content' => ['en' => ['texts' => ['title' => 'Our cities']]]]);
    section('share')->update(['is_visible' => false]);

    $keys = collect($this->getJson('/api/v1/public/home')->assertOk()->json('data'));

    expect($keys->pluck('key')->all())->not->toContain('share')->and($keys->pluck('key')->first())->toBe('hero');
    expect($keys->firstWhere('key', 'cities')['content']['en']['texts']['title'])->toBe('Our cities');
});

it('lets content staff edit text, links and images of a section', function () {
    manager();

    $this->patchJson('/api/v1/home-sections/'.section('cta')->id, ['content' => [
        'en' => ['texts' => ['title' => 'Ready to study in China?', 'primaryLink' => '/site/programs'], 'lists' => ['x' => [['label' => 'A', 'to' => 'https://cas.moe/page']]]],
        'zh' => ['texts' => ['title' => '准备好了吗？']],
        'images' => ['main' => '/uploads/catalog/abc.webp'],
    ]])->assertOk();

    $c = section('cta')->content;
    expect($c['en']['texts']['title'])->toBe('Ready to study in China?')
        ->and($c['zh']['texts']['title'])->toBe('准备好了吗？')
        ->and($c['images']['main'])->toBe('/uploads/catalog/abc.webp');
});

it('refuses unsafe links, foreign image sources and unknown keys', function () {
    manager();
    $id = section('cta')->id;

    $this->patchJson("/api/v1/home-sections/{$id}", ['content' => ['en' => ['texts' => ['primaryLink' => 'javascript:alert(1)']]]])->assertStatus(422);
    $this->patchJson("/api/v1/home-sections/{$id}", ['content' => ['en' => ['lists' => ['tab1' => [['label' => 'x', 'to' => 'data:text/html,hi']]]]]])->assertStatus(422);
    $this->patchJson("/api/v1/home-sections/{$id}", ['content' => ['images' => ['main' => 'http://insecure.example/a.png']]])->assertStatus(422);
    $this->patchJson("/api/v1/home-sections/{$id}", ['content' => ['xx' => ['texts' => ['title' => 'x']]]])->assertStatus(422);
    $this->patchJson("/api/v1/home-sections/{$id}", ['content' => ['en' => ['texts' => ['title' => str_repeat('x', 2001)]]]])->assertStatus(422);
    expect(section('cta')->content)->toBeNull();
});

it('hides and shows a section, but never the top banner', function () {
    manager();

    $this->patchJson('/api/v1/home-sections/'.section('why')->id, ['is_visible' => false])->assertOk();
    expect(collect($this->getJson('/api/v1/public/home')->json('data'))->pluck('key')->all())->not->toContain('why');

    $this->patchJson('/api/v1/home-sections/'.section('hero')->id, ['is_visible' => false])->assertStatus(422);
    expect(section('hero')->is_visible)->toBeTrue();
});

it('reorders sections and always keeps the top banner first', function () {
    manager();
    $ids = fn (array $keys) => array_map(fn ($k) => section($k)->id, $keys);

    $this->postJson('/api/v1/home-sections/reorder', ['order' => $ids(['cta', 'hero', 'highlights', 'cities'])])->assertOk();

    $order = HomeSection::orderBy('sort_order')->pluck('key')->all();
    expect(array_slice($order, 0, 4))->toBe(['hero', 'cta', 'highlights', 'cities'])->and($order)->toHaveCount(11);
    expect(collect($this->getJson('/api/v1/public/home')->json('data'))->pluck('key')->first())->toBe('hero');
});

it('adds, edits and deletes a custom section, but cannot delete a standard one', function () {
    manager();

    $id = $this->postJson('/api/v1/home-sections', [
        'type' => 'banner', 'content' => ['en' => ['texts' => ['title' => 'Open day', 'buttonLink' => '/site/contact'], 'images' => []]],
    ])->assertCreated()->json('data.id');
    $custom = HomeSection::findOrFail($id);
    expect($custom->key)->toStartWith('custom-')->and($custom->sort_order)->toBeGreaterThan(110);

    $this->deleteJson("/api/v1/home-sections/{$id}")->assertNoContent();
    $this->deleteJson('/api/v1/home-sections/'.section('cities')->id)->assertStatus(422);
    $this->postJson('/api/v1/home-sections', ['type' => 'hero'])->assertStatus(422);
});

it('resets a section to the standard text', function () {
    manager();
    section('cta')->update(['content' => ['en' => ['texts' => ['title' => 'Changed']]]]);

    $this->postJson('/api/v1/home-sections/'.section('cta')->id.'/reset')->assertOk();

    expect(section('cta')->content)->toBeNull();
});

it('keeps the manager away from staff without the content permission, and from visitors', function () {
    $this->patchJson('/api/v1/home-sections/'.section('cta')->id, ['is_visible' => false])->assertUnauthorized();

    actingAsStaffWith(['finance.view.global']);
    $this->getJson('/api/v1/home-sections')->assertForbidden();
    $this->postJson('/api/v1/home-sections/reorder', ['order' => [1]])->assertForbidden();

    actingAsStaffWith(['content.view.global']);
    $this->getJson('/api/v1/home-sections')->assertOk();
    $this->patchJson('/api/v1/home-sections/'.section('cta')->id, ['is_visible' => false])->assertForbidden();
});

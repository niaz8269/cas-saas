<?php

use App\Models\University;
use App\Services\Media\Thumbnails;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

it('keeps lists of universities small and the detail page complete', function () {
    $uni = University::factory()->create([
        'slug' => 'big-uni', 'status' => 'active', 'about' => str_repeat('About this university. ', 60),
        'overview' => [['h' => 'History', 'level' => 2, 'blocks' => [['t' => 'p', 'x' => 'A long history.']]]],
        'requirements' => ['IELTS 6.0'],
    ]);

    $row = getJson('/api/v1/public/universities')->assertOk()->json('data.0');
    expect($row)->not->toHaveKeys(['overview', 'guide', 'requirements'])
        ->and(mb_strlen($row['about']))->toBeLessThanOrEqual(223);

    $detail = getJson('/api/v1/public/universities/'.$uni->slug)->assertOk()->json('data');
    expect($detail)->toHaveKeys(['overview', 'requirements'])->and(mb_strlen($detail['about']))->toBeGreaterThan(300);
});

it('gives a card the small copy of its photo once it exists, and the original until then', function () {
    $dir = sys_get_temp_dir().'/cas-thumbs-'.uniqid();
    mkdir($dir.'/photos', 0777, true);
    config(['media.public_path' => $dir]);

    $img = imagecreatetruecolor(1200, 800);
    imagewebp($img, $dir.'/photos/abc.webp');

    University::factory()->create(['slug' => 'pic-uni', 'status' => 'active', 'cover_path' => '/photos/abc.webp']);
    expect(getJson('/api/v1/public/universities')->json('data.0.cover_thumb_url'))->toBeNull();

    expect(app(Thumbnails::class)->make('/photos/abc.webp'))->toBeTrue();
    $row = getJson('/api/v1/public/universities')->json('data.0');

    expect($row['cover_thumb_url'])->toBe('/photos/thumbs/abc.webp')
        ->and($row['cover_url'])->toBe('/photos/abc.webp')
        ->and(getimagesize($dir.'/photos/thumbs/abc.webp')[0])->toBe(480);
})->skip(! function_exists('imagewebp'), 'needs the GD WebP extension');

it('sends the directory lists and the city statistics only to pages that ask for them', function () {
    University::factory()->create(['slug' => 'a', 'status' => 'active', 'city' => 'Hangzhou', 'province' => 'Zhejiang']);

    $plain = getJson('/api/v1/public/universities')->assertOk()->json();
    expect($plain)->not->toHaveKeys(['cities', 'provinces', 'city_stats']);

    $withLists = getJson('/api/v1/public/universities?include=lists')->json();
    expect($withLists['cities'])->toBe(['Hangzhou'])->and($withLists['provinces'])->toBe(['Zhejiang'])->and($withLists)->not->toHaveKey('city_stats');

    expect(getJson('/api/v1/public/universities?include=city_stats')->json('city_stats.0.city'))->toBe('Hangzhou');
});

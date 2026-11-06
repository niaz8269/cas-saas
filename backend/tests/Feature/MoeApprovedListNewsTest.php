<?php

use App\Models\Post;
use App\Models\University;
use Database\Seeders\NewsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

const MOE_NEWS_SLUG = 'moe-approves-43-universities-english-mbbs-2026-27';

it('lists every MoE-approved university in the approval news post, linked and alphabetical', function () {
    University::factory()->create(['name' => 'Zhejiang University', 'slug' => 'zhejiang-university', 'city' => 'Hangzhou', 'moe_listed' => true]);
    University::factory()->create(['name' => 'Anhui Medical University', 'slug' => 'anhui-medical-university', 'city' => 'Hefei', 'moe_listed' => true]);
    University::factory()->create(['name' => 'Not On The List University', 'slug' => 'not-listed', 'moe_listed' => false]);

    (new NewsSeeder)->run();

    $body = Post::where('slug', MOE_NEWS_SLUG)->value('body');

    expect($body)->toContain('The 2 approved universities')
        ->toContain('<a href="/site/universities/anhui-medical-university">Anhui Medical University</a> (Hefei)')
        ->toContain('<a href="/site/universities/zhejiang-university">Zhejiang University</a> (Hangzhou)')
        ->not->toContain('Not On The List University')
        // Alphabetical: Anhui comes before Zhejiang.
        ->and(strpos($body, 'Anhui Medical University'))->toBeLessThan(strpos($body, 'Zhejiang University'))
        // The list is the end of the post: no "Source:" line follows it.
        ->and($body)->toEndWith('</ol>');
});

it('uses the mosaic of approved-university photos as the approval post cover', function () {
    (new NewsSeeder)->run();

    $cover = Post::where('slug', MOE_NEWS_SLUG)->value('cover_image_path');

    expect($cover)->toBe('/images/news-moe-mbbs-listed-2026-27.webp');

    // The image file ships with the frontend; check it when that folder is present
    // (it is in CI, not inside the Docker container, which mounts only the backend).
    if (is_dir(base_path('../frontend/public'))) {
        expect(file_exists(base_path('../frontend/public'.$cover)))->toBeTrue();
    }
});

it('keeps "Source:" citation lines out of every news post', function () {
    (new NewsSeeder)->run();

    $withSource = Post::where('body', 'like', '%Source:%')->pluck('slug');

    expect(Post::count())->toBeGreaterThan(0)
        ->and($withSource->all())->toBe([]);
});

it('escapes university names in the list', function () {
    University::factory()->create(['name' => 'A & B <script>x</script> University', 'slug' => 'a-b', 'city' => 'Xi\'an', 'moe_listed' => true]);

    (new NewsSeeder)->run();

    $body = Post::where('slug', MOE_NEWS_SLUG)->value('body');

    expect($body)->not->toContain('<script>')->toContain('A &amp; B &lt;script&gt;');
});

it('leaves the post without a list when no university is flagged', function () {
    University::factory()->create(['moe_listed' => false]);

    (new NewsSeeder)->run();

    expect(Post::where('slug', MOE_NEWS_SLUG)->value('body'))->not->toContain('<ol>');
});

<?php

use App\Models\Post;
use Database\Seeders\ArticleDepthSeeder;
use Database\Seeders\GuidesSeeder;
use Database\Seeders\NewsSeeder;
use Database\Seeders\SeoArticlesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function seedAllArticles($test): void
{
    foreach ([NewsSeeder::class, GuidesSeeder::class, SeoArticlesSeeder::class, ArticleDepthSeeder::class] as $seeder) {
        $test->seed($seeder);
    }
}

it('publishes keyword articles with headings, FAQs and a cover, and is idempotent', function () {
    seedAllArticles($this);
    seedAllArticles($this);

    foreach (['mbbs-in-china-2026-admission-guide', 'mbbs-in-china-2027-how-to-prepare-and-apply', 'phd-in-china-for-international-students'] as $slug) {
        $post = Post::where('slug', $slug)->firstOrFail();

        expect($post->type)->toBe('news')->and($post->status)->toBe('published')
            ->and($post->cover_image_path)->not->toBeEmpty()
            ->and($post->body)->toContain('<h2>')->toContain('Frequently asked questions')
            ->and(substr_count($post->body, '<!--depth-->'))->toBe($slug === 'mbbs-in-china-2026-admission-guide' ? 0 : 1)
            ->and(mb_strlen($post->title))->toBeLessThanOrEqual(60);
    }
});

it('merges the four short admission notices into one roundup', function () {
    seedAllArticles($this);

    expect(Post::where('slug', 'china-university-application-deadlines-2027-intakes')->value('status'))->toBe('published')
        ->and(Post::where('slug', 'nuist-september-2027-applications-close-30-april')->value('status'))->toBe('draft');
});

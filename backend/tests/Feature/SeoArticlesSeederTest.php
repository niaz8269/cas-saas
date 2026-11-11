<?php

use App\Models\Post;
use Database\Seeders\SeoArticlesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('publishes the keyword articles with headings, FAQs and a cover, and is idempotent', function () {
    $this->seed(SeoArticlesSeeder::class);
    $this->seed(SeoArticlesSeeder::class);

    $posts = Post::where('status', 'published')->whereIn('category', ['MBBS in China', 'Master & PhD', 'Scholarships', 'Study in China'])->get();

    expect($posts)->toHaveCount(11)
        ->and(Post::where('slug', 'mbbs-in-china-2026-admission-guide')->exists())->toBeTrue()
        ->and(Post::where('slug', 'mbbs-in-china-2027-how-to-prepare-and-apply')->exists())->toBeTrue();

    foreach ($posts as $post) {
        expect($post->type)->toBe('news')
            ->and($post->cover_image_path)->not->toBeEmpty()
            ->and($post->body)->toContain('<h2>')->toContain('Frequently asked questions')
            ->and(mb_strlen($post->title))->toBeLessThanOrEqual(60);
    }
});

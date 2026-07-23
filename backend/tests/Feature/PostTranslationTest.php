<?php

use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
 * Multilingual posts (ADR-0014): a unified {locale:{title,excerpt,body}} input
 * is split into a lightweight `translations` column (title+excerpt, on the list)
 * and a heavy `body_translations` column (HTML, detail only). Public endpoints
 * localise by ?lang with a fallback to the base columns.
 */

function createTranslatedPost(): int
{
    actingAsStaffWith(['content.view.global', 'content.manage.global']);

    return test()->postJson('/api/v1/posts', [
        'type' => 'news',
        'title' => 'Welcome to China',
        'excerpt' => 'Study abroad',
        'body' => '<p>English body</p>',
        'status' => 'published',
        'translations' => [
            'zh' => ['title' => '欢迎来到中国', 'excerpt' => '出国留学', 'body' => '<p>中文正文</p><script>bad()</script>'],
            'xx' => ['title' => 'unknown locale — dropped'],
        ],
    ])->assertCreated()->json('data.id');
}

it('splits translations into meta + body columns and sanitizes translated HTML', function () {
    createTranslatedPost();
    $post = Post::firstOrFail();

    expect($post->translations['zh'])->toBe(['title' => '欢迎来到中国', 'excerpt' => '出国留学'])
        ->and($post->translations)->not->toHaveKey('xx')          // unknown locale dropped
        ->and($post->body_translations['zh'])->toContain('中文正文')
        ->and($post->body_translations['zh'])->not->toContain('<script');
});

it('returns merged translations to the admin editor', function () {
    $id = createTranslatedPost();

    $data = $this->getJson("/api/v1/posts/{$id}")->assertOk()->json('data.translations');

    expect($data['zh']['title'])->toBe('欢迎来到中国')
        ->and($data['zh']['body'])->toContain('中文正文');
});

it('serves the requested language on public detail, falling back to base', function () {
    createTranslatedPost();
    $slug = Post::firstOrFail()->slug;

    $zh = $this->getJson("/api/v1/public/posts/{$slug}?lang=zh")->assertOk()->json('data');
    expect($zh['title'])->toBe('欢迎来到中国')->and($zh['body'])->toContain('中文正文');

    $fr = $this->getJson("/api/v1/public/posts/{$slug}?lang=fr")->assertOk()->json('data');
    expect($fr['title'])->toBe('Welcome to China')->and($fr['body'])->toContain('English body');
});

it('localises list cards by language but still omits the body', function () {
    createTranslatedPost();

    $res = $this->getJson('/api/v1/public/posts?lang=zh')->assertOk();

    expect($res->json('data.0.title'))->toBe('欢迎来到中国')
        ->and($res->json('data.0'))->not->toHaveKey('body');
});

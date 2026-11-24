<?php

use App\Models\Post;
use App\Models\University;
use App\Support\BrandLinks;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn () => config(['seo.site_url' => 'https://cas.moe', 'seo.page_cache_seconds' => 0]));

it('links every plain mention of Dalian Medical University to its own site', function () {
    $html = BrandLinks::apply('<p>Dalian Medical University is in Dalian. Ask Dalian Medical University.</p>');

    expect(substr_count($html, '<a href="https://dmu.cas.moe"'))->toBe(2)
        ->and($html)->toContain('>Dalian Medical University</a>');
});

it('leaves mentions inside links and headings alone', function () {
    $in = '<h2>Dalian Medical University</h2><p><a href="/site/universities/dalian-medical-university">Dalian Medical University</a></p>';

    expect(BrandLinks::apply($in))->toBe($in);
});

it('keeps other text, accents and tags intact', function () {
    $html = BrandLinks::apply('<ul><li>Café at Dalian Medical University &amp; more</li></ul>');

    expect($html)->toContain('Café at')->and($html)->toContain('&amp; more')->and($html)->toContain('dmu.cas.moe');
});

it('links the brand in the server-rendered page body and in the post API', function () {
    Post::create(['slug' => 'dmu-note', 'type' => 'news', 'title' => 'Note', 'excerpt' => 'x', 'body' => '<p>Study at Dalian Medical University.</p>', 'category' => 'MBBS', 'status' => 'published', 'published_at' => now()]);

    $this->get('/site/news/dmu-note')->assertOk()->assertSee('href="https://dmu.cas.moe"', false);
    $this->getJson('/api/v1/public/posts/dmu-note')->assertOk()->assertJsonPath('data.body', fn ($b) => str_contains($b, 'href="https://dmu.cas.moe"'));
});

it('redirects the old address of the MBBS approval post to the 2027 one', function () {
    $this->get('/site/news/moe-approves-43-universities-english-mbbs-2026-27')
        ->assertRedirect('/site/news/moe-approves-43-universities-english-mbbs-2027')
        ->assertStatus(301);
});

it('serves llms.txt as plain text built from the catalog', function () {
    University::factory()->create(['name' => 'Jilin University', 'slug' => 'jilin-university', 'city' => 'Changchun', 'status' => 'active', 'moe_listed' => true]);
    Post::create(['slug' => 'a-guide', 'type' => 'news', 'title' => 'A guide', 'excerpt' => 'About it', 'body' => '<p>x</p>', 'category' => 'MBBS', 'status' => 'published', 'published_at' => now()]);

    $res = $this->get('/llms.txt')->assertOk();
    $txt = $res->getContent();

    expect($res->headers->get('Content-Type'))->toContain('text/plain')
        ->and($txt)->toContain('https://cas.moe/site/universities/jilin-university')
        ->and($txt)->toContain('https://cas.moe/site/news/a-guide')
        ->and($txt)->toContain('https://cas.moe/sitemap.xml');
});

it('names the search and AI crawlers in robots.txt and still keeps private areas closed', function () {
    $txt = $this->get('/robots.txt')->assertOk()->getContent();

    foreach (['Googlebot', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'OAI-SearchBot'] as $bot) {
        expect($txt)->toContain("User-agent: {$bot}");
    }
    expect($txt)->toContain('Disallow: /portal')->and($txt)->toContain('Disallow: /admin')->and($txt)->toContain('Sitemap: https://cas.moe/sitemap.xml');
});

it('lists every active university in the directory the universities page links from', function () {
    University::factory()->create(['name' => 'Alpha University', 'slug' => 'alpha-university', 'city' => 'Beijing', 'status' => 'active']);
    University::factory()->create(['name' => 'Hidden University', 'slug' => 'hidden-university', 'status' => 'inactive']);

    $this->getJson('/api/v1/public/university-directory')->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'alpha-university');
});

it('lets the news list ask for every post at once', function () {
    foreach (range(1, 30) as $i) {
        Post::create(['slug' => "p-{$i}", 'type' => 'news', 'title' => "Post {$i}", 'excerpt' => 'x', 'body' => '<p>x</p>', 'category' => 'MBBS', 'status' => 'published', 'published_at' => now()->subMinutes($i)]);
    }

    $this->getJson('/api/v1/public/posts?per_page=50')->assertOk()->assertJsonCount(30, 'data');
});

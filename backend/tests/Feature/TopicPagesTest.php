<?php

use App\Services\Seo\TopicPages;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\get;
use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

it('serves a topic page as data and as crawlable HTML with FAQ data', function () {
    getJson('/api/v1/public/topics/bds-in-china')->assertOk()->assertJsonPath('data.h1', 'BDS in China for international students');

    $html = get('/site/bds-in-china')->assertOk()->getContent();
    expect($html)->toContain('<h1>BDS in China for international students</h1>')
        ->and($html)->toContain('FAQPage')
        ->and($html)->toContain('rel="canonical" href="'.rtrim(config('seo.site_url'), '/').'/site/bds-in-china"');
});

it('answers unknown topics with a 404', function () {
    getJson('/api/v1/public/topics/nope')->assertNotFound();
    get('/site/nope')->assertNotFound();
});

it('lists every topic in the sitemap and keeps copy and related links consistent', function () {
    $topics = app(TopicPages::class);
    $sitemap = get('/sitemaps/pages.xml')->getContent();

    foreach ($topics->all() as $slug => $page) {
        expect($sitemap)->toContain('/site/'.$slug)
            ->and(mb_strlen($page['description']))->toBeLessThanOrEqual(175)
            ->and($page['faq'])->not->toBeEmpty();
        foreach ($page['related'] as $r) {
            expect(str_starts_with($r, '/') || isset($topics->all()[$r]))->toBeTrue("{$slug} links to missing {$r}");
        }
    }
    expect(count($topics->all()))->toBeGreaterThanOrEqual(20);
});

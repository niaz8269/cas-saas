<?php

use App\Models\Post;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\get;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['seo.site_url' => 'https://example.test', 'seo.index_path' => '/nonexistent']);
});

it('serves the homepage with a title, canonical, structured data and crawlable links', function () {
    University::factory()->create(['name' => 'Seo Uni', 'slug' => 'seo-uni', 'status' => 'active', 'moe_listed' => true, 'city' => 'Dalian']);

    $html = get('/')->assertOk()->getContent();

    expect($html)->toContain('<title>CAS-Consultancy for Abroad Study | Study in China</title>')
        ->and($html)->toContain('<meta property="og:site_name" content="CAS-Consultancy for Abroad Study" />')
        ->and($html)->toContain('"@type":"WebSite","name":"CAS-Consultancy for Abroad Study"')
        ->and($html)->toContain('"alternateName":["CAS","CAS Education"')
        ->and($html)->toContain('<link rel="canonical" href="https://example.test/" />')
        ->and($html)->toContain('"@type":"WebSite"')
        ->and($html)->toContain('<h1>Study in China</h1>')
        ->and($html)->toContain('href="/site/universities/seo-uni"');
});

it('redirects /site to the homepage permanently', function () {
    get('/site')->assertStatus(301)->assertRedirect('/');
});

it('gives each university its own title, canonical, image and breadcrumb data', function () {
    University::factory()->create(['name' => 'Seo Uni', 'slug' => 'seo-uni', 'status' => 'active', 'moe_listed' => true, 'city' => 'Dalian', 'about' => 'A university used in a test.', 'cover_path' => '/photos/x.webp']);

    $html = get('/site/universities/seo-uni')->assertOk()->getContent();

    expect($html)->toContain('<title>Seo Uni: Programs, Fees &amp; Application Dates | CAS</title>')
        ->and($html)->toContain('rel="canonical" href="https://example.test/site/universities/seo-uni"')
        ->and($html)->toContain('property="og:image" content="https://example.test/photos/x.webp"')
        ->and($html)->toContain('"@type":"CollegeOrUniversity"')
        ->and($html)->toContain('"@type":"BreadcrumbList"');
});

it('returns a real 404 with noindex for unknown public URLs', function () {
    get('/site/universities/no-such-university')->assertNotFound()->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    get('/site/not-a-page')->assertNotFound();
});

it('never indexes the staff app and portals', function () {
    get('/admin')->assertOk()->assertHeader('X-Robots-Tag', 'noindex, nofollow');
});

it('serves robots.txt that allows the public site and points to the sitemap', function () {
    $txt = get('/robots.txt')->assertOk()->getContent();

    expect($txt)->toContain('Allow: /')->toContain('Disallow: /api/')->toContain('Sitemap: https://example.test/sitemap.xml');
});

it('lists every university, city and news post in the sitemaps', function () {
    University::factory()->create(['slug' => 'seo-uni', 'status' => 'active', 'moe_listed' => true, 'city' => 'Dalian']);
    University::factory()->create(['slug' => 'hidden-uni', 'status' => 'inactive']);
    Post::factory()->create(['slug' => 'seo-news', 'status' => 'published', 'published_at' => now()]);

    get('/sitemap.xml')->assertOk()->assertSee('https://example.test/sitemaps/universities.xml', false);
    $unis = get('/sitemaps/universities.xml')->assertOk()->getContent();
    expect($unis)->toContain('/site/universities/seo-uni')->not->toContain('hidden-uni');
    get('/sitemaps/cities.xml')->assertSee('/site/cities/dalian', false);
    get('/sitemaps/news.xml')->assertSee('/site/news/seo-news', false);
    get('/sitemaps/pages.xml')->assertSee('/site/mbbs-in-china', false);
});

it('does not expose official links in the server-rendered HTML', function () {
    University::factory()->create(['slug' => 'seo-uni', 'status' => 'active', 'website' => 'https://www.official-site.example', 'apply_link' => 'https://apply.official-site.example']);

    expect(get('/site/universities/seo-uni')->getContent())->not->toContain('official-site.example');
});

it('hides the crawlable text behind a loading screen but keeps it in the page', function () {
    $html = $this->get('/')->assertOk()->getContent();

    expect($html)->toContain('id="cas-splash"')
        ->and($html)->toContain('id="cas-seo"')
        ->and($html)->toContain('clip:rect(0 0 0 0)');
});

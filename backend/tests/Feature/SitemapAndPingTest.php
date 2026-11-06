<?php

use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Defer\DeferredCallbackCollection;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

it('lists every active university, city and published news post, and picks up new ones by itself', function () {
    University::create(['name' => 'Alpha University', 'code' => 'A1', 'slug' => 'alpha-university', 'city' => "Xi'an", 'status' => 'active', 'moe_listed' => true]);
    University::create(['name' => 'Hidden University', 'code' => 'H1', 'slug' => 'hidden-university', 'city' => 'Nowhere', 'status' => 'inactive']);

    $before = $this->get('/sitemaps/universities.xml')->assertOk()->getContent();
    expect($before)->toContain('/site/universities/alpha-university')->not->toContain('hidden-university');
    expect($this->get('/sitemaps/cities.xml')->getContent())->toContain('/site/cities/xian');

    University::create(['name' => 'Beta University', 'code' => 'B1', 'slug' => 'beta-university', 'status' => 'active', 'moe_listed' => true]);
    expect($this->get('/sitemaps/universities.xml')->getContent())->toContain('/site/universities/beta-university');

    expect($this->get('/sitemap.xml')->getContent())->toContain('/sitemaps/news.xml');
    expect($this->get('/robots.txt')->getContent())->toContain('Sitemap:')->toContain('Disallow: /wm/');
});

it('tells IndexNow when a university or news post is added', function () {
    config(['seo.indexnow_key' => 'abc123abc123abc123abc123abc123ab', 'seo.site_url' => 'https://cas.test', 'seo.ping_from_console' => true]);
    Http::fake();

    University::create(['name' => 'Gamma University', 'code' => 'G1', 'slug' => 'gamma-university', 'status' => 'active']);

    // The ping runs after the response; run the deferred work now.
    app(DeferredCallbackCollection::class)->invoke();

    Http::assertSent(fn ($request) => str_contains($request->url(), 'indexnow')
        && in_array('https://cas.test/site/universities/gamma-university', $request['urlList'], true)
        && $request['keyLocation'] === 'https://cas.test/abc123abc123abc123abc123abc123ab.txt');
});

it('keeps a university page with no real content out of search results until it has some', function () {
    $uni = University::create(['name' => 'Thin University', 'code' => 'T1', 'slug' => 'thin-university', 'city' => 'Anyang', 'status' => 'active']);
    $uni->programs()->create(['name' => 'Accounting', 'level' => 'bachelor', 'registry_only' => true, 'status' => 'active']);

    expect($this->get('/site/universities/thin-university')->getContent())->toContain('noindex, follow');
    expect($this->get('/sitemaps/universities.xml')->getContent())->not->toContain('thin-university');

    // A confirmed program turns the page on, in the page and in the sitemap, with no other step.
    $uni->programs()->create(['name' => 'Business English', 'level' => 'bachelor', 'registry_only' => false, 'status' => 'active']);

    expect($this->get('/site/universities/thin-university')->getContent())->toContain('index, follow')->not->toContain('noindex');
    expect($this->get('/sitemaps/universities.xml')->getContent())->toContain('thin-university');
});

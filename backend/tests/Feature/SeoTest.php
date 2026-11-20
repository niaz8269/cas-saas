<?php

use App\Models\Post;
use App\Models\Program;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\get;
use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['seo.site_url' => 'https://example.test', 'seo.index_path' => '/nonexistent']);
});

it('serves the homepage with a title, canonical, structured data and crawlable links', function () {
    University::factory()->create(['name' => 'Seo Uni', 'slug' => 'seo-uni', 'status' => 'active', 'moe_listed' => true, 'city' => 'Dalian']);

    $html = get('/')->assertOk()->getContent();

    expect($html)->toContain('<title>CAS - Study in China | Apply to Chinese Universities Online</title>')
        ->and($html)->toContain('<meta property="og:site_name" content="CAS - Study in China" />')
        ->and($html)->toContain('"@type":"WebSite","name":"CAS - Study in China"')
        ->and($html)->toContain('"alternateName":["CAS","CAS-Consultancy for Abroad Study"')
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

    expect($html)->toContain('<title>MBBS in China - Seo Uni: Fees &amp; Admission | CAS</title>')
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

it('keeps a city page out of search results until one of its universities has substance', function () {
    University::factory()->create(['slug' => 'thin-uni', 'status' => 'active', 'moe_listed' => false, 'overview' => null, 'city' => 'Thinville']);
    University::factory()->create(['slug' => 'rich-uni', 'status' => 'active', 'moe_listed' => true, 'city' => 'Richburg']);

    get('/site/cities/thinville')->assertOk()->assertHeader('X-Robots-Tag', 'noindex, follow');
    get('/site/cities/richburg')->assertOk()->assertHeader('X-Robots-Tag', 'index, follow, max-image-preview:large');

    $sitemap = get('/sitemaps/cities.xml')->getContent();
    expect($sitemap)->toContain('/site/cities/richburg')->and($sitemap)->not->toContain('/site/cities/thinville');
});

it('sends no cookies with public pages so they can be cached', function () {
    University::factory()->create(['slug' => 'seo-uni', 'status' => 'active', 'moe_listed' => true, 'city' => 'Dalian']);

    foreach (['/', '/site/universities/seo-uni', '/sitemap.xml', '/robots.txt'] as $url) {
        expect(get($url)->assertOk()->headers->getCookies())->toBe([]);
    }
});

it('indexes a university page once it lists enough Ministry-registered majors, and shows them', function () {
    config(['seo.min_registered_majors' => 3]);
    $rich = University::factory()->create(['slug' => 'majors-uni', 'name' => 'Majors Uni', 'status' => 'active', 'moe_listed' => false, 'overview' => null, 'city' => 'Majorville']);
    foreach (['Mining Engineering', 'Big Data Management', 'Digital Economy'] as $name) {
        Program::factory()->create(['university_id' => $rich->id, 'name' => $name, 'level' => 'bachelor', 'registry_only' => true, 'teaching_language' => null, 'tuition_fee' => null]);
    }
    $thin = University::factory()->create(['slug' => 'few-majors-uni', 'status' => 'active', 'moe_listed' => false, 'overview' => null, 'city' => 'Fewville']);
    Program::factory()->create(['university_id' => $thin->id, 'name' => 'Only One', 'level' => 'bachelor', 'registry_only' => true, 'teaching_language' => null, 'tuition_fee' => null]);

    $page = get('/site/universities/majors-uni')->assertOk()->assertHeader('X-Robots-Tag', 'index, follow, max-image-preview:large');
    expect($page->getContent())->toContain('Majors registered with the Ministry of Education')->toContain('Mining Engineering')->toContain('Bachelor&#039;s degree majors (3)');

    get('/site/universities/few-majors-uni')->assertOk()->assertHeader('X-Robots-Tag', 'noindex, follow');
    get('/site/cities/majorville')->assertHeader('X-Robots-Tag', 'index, follow, max-image-preview:large');

    $sitemap = get('/sitemaps/universities.xml')->getContent();
    expect($sitemap)->toContain('/site/universities/majors-uni')->not->toContain('few-majors-uni');
});

it('leads MBBS-approved universities with "MBBS in China", never cuts a long name, and leaves other universities as they were', function () {
    University::factory()->create(['name' => 'North China University of Science and Technology', 'slug' => 'long-mbbs', 'status' => 'active', 'moe_listed' => true, 'city' => 'Tangshan', 'about' => null]);
    University::factory()->create(['name' => 'Plain Uni', 'slug' => 'plain-uni', 'status' => 'active', 'moe_listed' => false, 'city' => 'Dalian', 'about' => 'About text.']);

    $long = get('/site/universities/long-mbbs')->getContent();
    expect($long)->toContain('<title>MBBS in China - North China University of Science and Technology')
        ->and($long)->toContain('content="MBBS in China at North China University of Science and Technology');

    expect(get('/site/universities/plain-uni')->getContent())->toContain('<title>Plain Uni: Programs, Fees &amp; Application Dates');
});

it('prints questions and FAQ data on the main pages, university pages, city pages and posts', function () {
    $u = University::factory()->create(['name' => 'Faq Medical University', 'slug' => 'faq-uni', 'status' => 'active', 'moe_listed' => true, 'city' => 'Dalian', 'province' => 'Liaoning', 'about' => 'About text.']);
    Program::factory()->create(['university_id' => $u->id, 'name' => 'Clinical Medicine', 'level' => 'bachelor', 'teaching_language' => 'English', 'status' => 'active', 'registry_only' => false]);

    $mbbs = get('/site/mbbs-in-china')->assertOk()->getContent();
    expect($mbbs)->toContain('"@type":"FAQPage"')->toContain('<h3>How long is an MBBS in China?</h3>')->toContain('there are 1, all listed on this page');

    $home = get('/')->getContent();
    expect($home)->toContain('"@type":"FAQPage"')->toContain('<h3>Why study in China?</h3>');

    $uni = get('/site/universities/faq-uni')->getContent();
    expect($uni)->toContain('"@type":"FAQPage"')
        ->toContain('<h3>Is Faq Medical University approved for English-taught MBBS in China?</h3>')
        ->toContain('Faq Medical University is in Dalian, Liaoning, China.')
        ->toContain('CAS lists 1 program for international students at Faq Medical University: 1 bachelor&#039;s.')
        ->toContain('<h3>Does Faq Medical University teach in English?</h3>');

    $city = get('/site/cities/dalian')->getContent();
    expect($city)->toContain('<h3>How many universities are in Dalian?</h3>')->toContain('<h3>Which universities in Dalian are approved for English-taught MBBS?</h3>');

    Post::factory()->create(['title' => 'Guide', 'slug' => 'guide', 'status' => 'published', 'published_at' => now(), 'body' => '<h2>Intro</h2><p>Text.</p><h2>How long does it take?</h2><p>The whole process usually takes several months from the first document to the visa.</p><h3>Do I need a visa?</h3><p>Yes, a student visa is required for study that lasts longer than six months.</p>']);
    $post = get('/site/news/guide')->getContent();
    expect($post)->toContain('"@type":"FAQPage"')->toContain('"name":"Do I need a visa?"')->not->toContain('"name":"Intro"');
});

it('serves the page questions, and the university and city questions, to the website', function () {
    $u = University::factory()->create(['name' => 'Api Uni', 'slug' => 'api-uni', 'status' => 'active', 'moe_listed' => false, 'city' => 'Harbin', 'province' => 'Heilongjiang']);

    expect(getJson('/api/v1/public/page-faqs?path=site/csc-scholarship')->assertOk()->json('data.0.q'))->toBe('What is the CSC scholarship?');
    expect(getJson('/api/v1/public/page-faqs?path=site/nothing')->assertOk()->json('data'))->toBe([]);

    $questions = collect(getJson('/api/v1/public/universities/api-uni')->assertOk()->json('faqs'))->pluck('q');
    expect($questions)->toContain('Where is Api Uni?')->toContain('How do I apply to Api Uni?')->not->toContain('Is Api Uni approved for English-taught MBBS in China?');

    expect(getJson('/api/v1/public/cities/harbin')->assertOk()->json('faqs.0.q'))->toBe('How many universities are in Harbin?');
});

it('prints the full text of the main pages and a live summary of the program catalog', function () {
    $u = University::factory()->create(['name' => 'Big Uni', 'slug' => 'big-uni', 'status' => 'active', 'city' => 'Wuhan', 'province' => 'Hubei']);
    Program::factory()->count(2)->create(['university_id' => $u->id, 'level' => 'bachelor', 'teaching_language' => 'English', 'status' => 'active', 'registry_only' => false]);
    Program::factory()->create(['university_id' => $u->id, 'level' => 'master', 'teaching_language' => 'Chinese', 'status' => 'active', 'registry_only' => false]);

    $programs = get('/site/programs')->assertOk()->getContent();
    expect($programs)->toContain('It lists 3 programs for international students at 1 university in China')
        ->toContain('Bachelor&#039;s degrees: 2 programs')
        ->toContain('2 programs taught in English')
        ->toContain('href="/site/universities/big-uni"');

    expect(get('/site/services')->getContent())->toContain('<h2>What we do for you</h2>')->toContain('Admission service:');
    expect(get('/site/about')->getContent())->toContain('<h2>How we help</h2>');
    expect(get('/site/pricing')->getContent())->toContain('<h2>What CAS charges</h2>');
    expect(get('/site/partner')->getContent())->toContain('<h2>How a commission progresses</h2>');
    expect(get('/site/why-china')->getContent())->toContain('<h2>Reasons students choose China</h2>');
});

it('gives a small college page its province neighbours', function () {
    University::factory()->create(['name' => 'Lone College', 'slug' => 'lone-college', 'status' => 'active', 'city' => 'Aba', 'province' => 'Sichuan', 'about' => 'A college.']);
    University::factory()->create(['name' => 'Chengdu Uni', 'slug' => 'chengdu-uni', 'status' => 'active', 'city' => 'Chengdu', 'province' => 'Sichuan']);

    expect(get('/site/universities/lone-college')->getContent())->toContain('<h2>Other universities in Sichuan</h2>')->toContain('href="/site/universities/chengdu-uni"');
});

it('counts the headline numbers from the catalog and gives the remaining pages their questions', function () {
    $u = University::factory()->create(['status' => 'active', 'moe_listed' => true]);
    Program::factory()->create(['university_id' => $u->id, 'status' => 'active', 'registry_only' => false, 'teaching_language' => 'English', 'csc_listed' => true]);
    Program::factory()->create(['university_id' => $u->id, 'status' => 'active', 'registry_only' => false, 'teaching_language' => 'Chinese', 'csc_listed' => false]);
    Program::factory()->create(['university_id' => $u->id, 'status' => 'active', 'registry_only' => true, 'teaching_language' => 'English']);

    expect(getJson('/api/v1/public/stats')->assertOk()->json('data'))->toBe(['universities' => 1, 'programs' => 2, 'english_programs' => 1, 'csc_programs' => 1, 'mbbs_universities' => 1]);

    expect(get('/site/about')->getContent())->toContain('"@type":"FAQPage"')->toContain('<h3>What is CAS?</h3>');
    expect(get('/site/contact')->getContent())->toContain('<h3>How can I reach a CAS counselor?</h3>');
    expect(get('/site/cities')->getContent())->toContain('<h3>How do I choose a city to study in China?</h3>');
    expect(get('/site/news')->getContent())->toContain('"@type":"FAQPage"');
});

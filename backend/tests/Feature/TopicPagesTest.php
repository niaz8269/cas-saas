<?php

use App\Models\Intake;
use App\Models\Program;
use App\Models\University;
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

it('shows real catalog facts on a topic page', function () {
    $uni = University::factory()->create(['status' => 'active', 'slug' => 'dent-uni', 'name' => 'Dent Uni']);
    foreach ([20000, 30000, 40000] as $fee) {
        Program::factory()->create(['university_id' => $uni->id, 'name' => 'Stomatology '.$fee, 'level' => 'bachelor', 'status' => 'active', 'registry_only' => false, 'currency' => 'CNY', 'tuition_fee' => $fee]);
    }
    Intake::factory()->create(['university_id' => $uni->id, 'program_id' => Program::first()->id, 'status' => 'open', 'application_deadline' => now()->addMonth()]);

    $facts = getJson('/api/v1/public/topics/bds-in-china')->json('data.facts');
    expect($facts['programs'])->toBe(3)->and($facts['universities'])->toBe(1)->and($facts['deadlines'][0]['slug'])->toBe('dent-uni');

    $html = get('/site/bds-in-china')->getContent();
    expect($html)->toContain('On CAS right now: 3 matching programs at 1 universities')->and($html)->toContain('Last reviewed 2026-11-17')->and($html)->toContain('dateModified');
});

it('serves the "every program" topics and keeps BDS facts to bachelor programs', function () {
    $uni = University::factory()->create(['status' => 'active']);
    Program::factory()->create(['university_id' => $uni->id, 'name' => 'Stomatology (BDS)', 'level' => 'bachelor', 'status' => 'active', 'registry_only' => false]);
    Program::factory()->create(['university_id' => $uni->id, 'name' => 'Stomatology', 'level' => 'master', 'status' => 'active', 'registry_only' => false]);

    getJson('/api/v1/public/topics/study-in-china-for-pakistani-students')->assertOk()->assertJsonPath('data.facts.programs', 2);
    getJson('/api/v1/public/topics/bds-in-china')->assertOk()->assertJsonPath('data.facts.programs', 1);
});

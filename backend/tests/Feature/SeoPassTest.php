<?php

use App\Models\CityProfile;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn () => config(['seo.site_url' => 'https://cas.moe', 'seo.page_cache_seconds' => 0]));

/** All JSON-LD blocks of a page, decoded. */
function jsonLdOf(string $html): array
{
    preg_match_all('#<script type="application/ld\+json">(.*?)</script>#s', $html, $m);

    return array_map(fn ($j) => json_decode($j, true), $m[1]);
}

it('gives the FAQ page FAQPage data and the answers as crawlable text', function () {
    $html = $this->get('/site/faq')->assertOk()->getContent();
    $faq = collect(jsonLdOf($html))->firstWhere('@type', 'FAQPage');

    expect($faq['mainEntity'])->toHaveCount(18)
        ->and($faq['mainEntity'][0]['@type'])->toBe('Question')
        ->and($html)->toContain('<h3>Why study in China?</h3>');
});

it('keeps the FAQ data the website serves identical to the questions shown on the page', function () {
    $en = json_decode(file_get_contents(base_path('../frontend/src/i18n/locales/en.json')), true)['faq'];
    $shown = collect($en)->filter(fn ($v) => is_array($v) && isset($v['title']))->flatMap(function ($g) {
        $out = [];
        for ($i = 1; isset($g["q{$i}"]); $i++) {
            $out[] = ['q' => $g["q{$i}"], 'a' => $g["a{$i}"]];
        }

        return $out;
    })->values()->all();
    $served = collect(json_decode(file_get_contents(database_path('data/faq.json')), true))->flatMap(fn ($g) => $g['items'])->values()->all();

    expect($served)->toBe($shown);
});

it('describes the organisation with its contact and profile links', function () {
    $org = collect(jsonLdOf($this->get('/')->getContent()))->firstWhere('@type', 'EducationalOrganization');

    expect($org['contactPoint'][0]['email'])->toBe('info@cas.moe')
        ->and($org['sameAs'])->toContain('https://www.facebook.com/share/1F7EUukSv2/');
});

it('builds a city page from its profile: summary, history and places, plus City data', function () {
    University::factory()->create(['slug' => 'zju', 'status' => 'active', 'city' => 'Hangzhou', 'province' => 'Zhejiang', 'moe_listed' => true]);
    CityProfile::create([
        'slug' => 'hangzhou', 'city' => 'Hangzhou', 'province' => 'Zhejiang',
        'summary' => "Hangzhou is the capital of Zhejiang.\n\nIt sits on the Qiantang River.",
        'sections' => [
            ['group' => 'history', 'h' => 'History', 'level' => 2, 'blocks' => [['t' => 'p', 'x' => 'Settled for thousands of years.']]],
            ['group' => 'places', 'h' => 'Tourism', 'level' => 2, 'blocks' => [['t' => 'p', 'x' => 'West Lake is a World Heritage Site.']]],
        ],
        'source_url' => 'https://en.wikipedia.org/wiki/Hangzhou',
    ]);

    $html = $this->get('/site/cities/hangzhou')->assertOk()->getContent();
    $city = collect(jsonLdOf($html))->firstWhere('@type', 'City');

    expect($html)->toContain('<h2>History</h2>')->toContain('West Lake is a World Heritage Site.')->toContain('Source: Wikipedia')
        ->and($city['name'])->toBe('Hangzhou')
        ->and($city['containedInPlace']['name'])->toBe('Zhejiang')
        ->and($html)->toContain('content="Hangzhou is the capital of Zhejiang."');
});

it('tells social networks the size and meaning of the default share image', function () {
    $html = $this->get('/')->getContent();

    expect($html)->toContain('og:image:width" content="1200"')->toContain('og:image:height" content="630"')->toContain('og:locale" content="en_US"');
});

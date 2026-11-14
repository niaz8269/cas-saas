<?php

use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('changes published articles that call CAS an agent to an agency, and only that phrase', function () {
    $old = Post::factory()->create([
        'body' => '<p>CAS is an authorized agent that places students. Other agents exist; a good agent explains fees.</p>',
        'excerpt' => 'Official info from an authorized agent.',
    ]);
    $clean = Post::factory()->create(['body' => '<p>Nothing to change here.</p>', 'excerpt' => 'Plain.']);

    (require database_path('migrations/2026_11_18_100000_say_agency_in_published_articles.php'))->up();

    expect($old->fresh()->body)->toBe('<p>CAS is an authorized agency that places students. Other agents exist; a good agent explains fees.</p>')
        ->and($old->fresh()->excerpt)->toBe('Official info from an authorized agency.')
        ->and($clean->fresh()->body)->toBe('<p>Nothing to change here.</p>');

    // Running it again changes nothing.
    (require database_path('migrations/2026_11_18_100000_say_agency_in_published_articles.php'))->up();
    expect($old->fresh()->body)->toContain('authorized agency that places');
});

it('no longer calls CAS an authorized agent in the SEO text or seeded articles', function () {
    foreach ([
        base_path('config/seo.php'),
        base_path('app/Services/Seo/SeoPageBuilder.php'),
        base_path('database/seeders/SeoArticlesSeeder.php'),
        base_path('database/seeders/ArticleDepthSeeder.php'),
    ] as $file) {
        expect(preg_match('/\b[Aa]uthorized agent\b/', file_get_contents($file)))->toBe(0, $file);
    }
});

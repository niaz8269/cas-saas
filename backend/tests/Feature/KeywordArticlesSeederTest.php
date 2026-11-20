<?php

use App\Models\Post;
use App\Models\Program;
use App\Models\University;
use App\Services\Seo\PageFaqs;
use Database\Seeders\KeywordArticlesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('writes the four keyword articles from catalog data, with question headings, and can run twice', function () {
    $u = University::factory()->create(['name' => 'Tech University', 'slug' => 'tech-university', 'status' => 'active', 'city' => 'Harbin']);
    Program::factory()->count(6)->create(['university_id' => $u->id, 'name' => 'Civil Engineering', 'level' => 'bachelor', 'teaching_language' => 'English', 'status' => 'active', 'registry_only' => false, 'tuition_fee' => 20000, 'currency' => 'CNY', 'visibility' => ['tuition_fee' => ['public']]]);
    Program::factory()->create(['university_id' => $u->id, 'name' => 'Stomatology', 'level' => 'bachelor', 'teaching_language' => 'Chinese', 'status' => 'active', 'registry_only' => false]);
    Program::factory()->create(['university_id' => $u->id, 'name' => 'Hidden Engineering', 'level' => 'bachelor', 'teaching_language' => 'English', 'status' => 'active', 'registry_only' => true]);

    $this->seed(KeywordArticlesSeeder::class);
    $this->seed(KeywordArticlesSeeder::class);

    expect(Post::count())->toBe(4);

    $engineering = Post::where('slug', 'engineering-in-china-for-international-students')->firstOrFail();
    expect($engineering->status)->toBe('published')
        ->and($engineering->body)->toContain('CAS lists 6 engineering programs for international students, 6 of them taught in English.')
        ->toContain('href="/site/universities/tech-university"')
        ->toContain('Civil Engineering: 6 programs');

    $dentistry = Post::where('slug', 'bds-in-china-dentistry-for-international-students')->firstOrFail();
    expect($dentistry->body)->toContain('CAS lists 1 dentistry program, 0 of them taught in English.');

    $costs = Post::where('slug', 'cost-of-studying-in-china-tuition-living-costs-and-budget')->firstOrFail();
    expect($costs->body)->toContain('median 20,000 CNY a year');

    // Every article carries question headings the page builder turns into FAQ data.
    foreach (Post::all() as $post) {
        expect(count(app(PageFaqs::class)->fromHtml($post->body)))->toBeGreaterThanOrEqual(5)
            ->and($post->body)->not->toContain('Checked against official');
    }
});

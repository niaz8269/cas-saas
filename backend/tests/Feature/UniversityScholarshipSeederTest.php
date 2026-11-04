<?php

use App\Models\Scholarship;
use App\Models\University;
use Database\Seeders\UniversityScholarshipSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('seeds sourced university scholarships idempotently', function () {
    $data = json_decode(file_get_contents(database_path('data/university_scholarships.json')), true)['universities'];
    $slug = array_key_first($data);
    University::factory()->create(['slug' => $slug]);

    $this->seed(UniversityScholarshipSeeder::class);
    $this->seed(UniversityScholarshipSeeder::class);

    $rows = Scholarship::where('scope', 'university')->get();
    expect($rows)->toHaveCount(count($data[$slug]))
        ->and($rows->every(fn ($s) => $s->source_url && $s->verified_on && $s->university_id))->toBeTrue();
});

it('never stores a past deadline and keeps coverage within the column length', function () {
    $data = json_decode(file_get_contents(database_path('data/university_scholarships.json')), true)['universities'];

    foreach ($data as $rows) {
        foreach ($rows as $r) {
            expect(strlen($r['coverage']))->toBeLessThanOrEqual(120);
            if ($r['deadline']) {
                expect($r['deadline'] >= '2026-11-04')->toBeTrue();
            }
        }
    }
});

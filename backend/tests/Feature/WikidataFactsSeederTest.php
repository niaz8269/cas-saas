<?php

use App\Models\University;
use Database\Seeders\WikidataFactsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('fills missing address and student count without overwriting existing values', function () {
    $facts = json_decode(file_get_contents(database_path('data/wikidata_facts.json')), true)['universities'];
    $slug = array_key_first(array_filter($facts, fn ($f) => ! empty($f['address']) && ! empty($f['students'])));

    $empty = University::factory()->create(['slug' => $slug, 'address' => null, 'student_count' => null]);
    $this->seed(WikidataFactsSeeder::class);
    $empty->refresh();
    expect($empty->address)->toBe($facts[$slug]['address'])
        ->and($empty->student_count)->toBe(number_format($facts[$slug]['students']));

    $empty->update(['address' => 'Kept Road 1', 'student_count' => '5']);
    $this->seed(WikidataFactsSeeder::class);
    $empty->refresh();
    expect($empty->address)->toBe('Kept Road 1')->and($empty->student_count)->toBe('5');
});

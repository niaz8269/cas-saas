<?php

use App\Models\Scholarship;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

const SCH_MANAGE = ['scholarships.view.global', 'scholarships.manage.global'];

it('auto-generates a unique slug from the name', function () {
    $u = University::factory()->create();
    $a = Scholarship::factory()->for($u)->create(['name' => 'Presidential Scholarship', 'slug' => null]);
    $b = Scholarship::factory()->for($u)->create(['name' => 'Presidential Scholarship', 'slug' => null]);

    expect($a->slug)->toBe('presidential-scholarship')
        ->and($b->slug)->toBe('presidential-scholarship-2');
});

it('stores the website content fields via the API', function () {
    actingAsStaffWith(SCH_MANAGE);
    $university = University::factory()->create();

    $this->postJson('/api/v1/scholarships', [
        'university_id' => $university->id,
        'name' => 'Belt & Road Scholarship',
        'type' => 'full',
        'coverage' => 'Full tuition + stipend',
        'amount' => 30000,
        'currency' => 'CNY',
        'description' => 'A flagship scholarship for international students.',
        'eligibility' => 'Open to first-year international undergraduates.',
        'how_to_apply' => 'Apply through the CAS counselor with your admission letter.',
        'apply_link' => 'https://apply.example.cn/scholarship',
        'deadline' => '2026-06-30',
    ])
        ->assertCreated()
        ->assertJsonPath('data.slug', 'belt-road-scholarship')
        ->assertJsonPath('data.amount', '30000.00')
        ->assertJsonPath('data.currency', 'CNY')
        ->assertJsonPath('data.eligibility', 'Open to first-year international undergraduates.')
        ->assertJsonPath('data.apply_link', 'https://apply.example.cn/scholarship');
});

it('validates amount and a malformed slug', function () {
    actingAsStaffWith(SCH_MANAGE);
    $u = University::factory()->create();

    $this->postJson('/api/v1/scholarships', [
        'university_id' => $u->id, 'name' => 'X', 'amount' => 'not-a-number',
    ])->assertStatus(422);

    $this->postJson('/api/v1/scholarships', [
        'university_id' => $u->id, 'name' => 'Y', 'slug' => 'Not A Slug!',
    ])->assertStatus(422);
});

it('updates content fields and preserves the slug on rename', function () {
    actingAsStaffWith(SCH_MANAGE);
    $sch = Scholarship::factory()->create(['name' => 'Old', 'slug' => 'old-award']);

    $this->patchJson("/api/v1/scholarships/{$sch->id}", [
        'name' => 'New', 'description' => 'Updated copy.',
    ])
        ->assertOk()
        ->assertJsonPath('data.slug', 'old-award')
        ->assertJsonPath('data.description', 'Updated copy.');
});

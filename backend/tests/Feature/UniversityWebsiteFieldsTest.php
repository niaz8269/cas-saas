<?php

use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

const UNI_MANAGE = ['universities.view.global', 'universities.manage.global'];

it('auto-generates a unique slug from the name on create', function () {
    $a = University::factory()->create(['name' => 'Jilin Medical University', 'slug' => null]);
    $b = University::factory()->create(['name' => 'Jilin Medical University', 'slug' => null]);

    expect($a->slug)->toBe('jilin-medical-university')
        ->and($b->slug)->toBe('jilin-medical-university-2');
});

it('stores the website content fields via the API', function () {
    actingAsStaffWith(UNI_MANAGE);

    $payload = [
        'name' => 'Dalian Medical University',
        'code' => 'DMU',
        'address' => '9 Western Section, Lvshun South Road, Dalian',
        'moe_listed' => true,
        'nearest_airport' => 'Dalian Zhoushuizi International Airport (DLC)',
        'about' => 'A leading medical university in Liaoning.',
        'apply_link' => 'https://apply.dmu.edu.cn',
        'requirements' => ['High school diploma', 'IELTS 6.0', 'Age 18-25'],
        'representative_professor' => ['name' => 'Prof. Li Wei', 'title' => 'Dean of International Education', 'photo' => 'https://cdn/li.webp'],
    ];

    $this->postJson('/api/v1/universities', $payload)
        ->assertCreated()
        ->assertJsonPath('data.slug', 'dalian-medical-university')
        ->assertJsonPath('data.moe_listed', true)
        ->assertJsonPath('data.requirements', ['High school diploma', 'IELTS 6.0', 'Age 18-25'])
        ->assertJsonPath('data.representative_professor.name', 'Prof. Li Wei')
        ->assertJsonPath('data.nearest_airport', 'Dalian Zhoushuizi International Airport (DLC)');

    $uni = University::firstWhere('code', 'DMU');
    expect($uni->requirements)->toBeArray()->toHaveCount(3)
        ->and($uni->moe_listed)->toBeTrue();
});

it('rejects a duplicate or malformed slug', function () {
    actingAsStaffWith(UNI_MANAGE);
    University::factory()->create(['slug' => 'taken-slug']);

    $this->postJson('/api/v1/universities', ['name' => 'X', 'code' => 'X1', 'slug' => 'taken-slug'])
        ->assertStatus(422)->assertJsonPath('code', 'VALIDATION_ERROR');

    $this->postJson('/api/v1/universities', ['name' => 'Y', 'code' => 'Y1', 'slug' => 'Not A Slug!'])
        ->assertStatus(422);
});

it('updates content fields and preserves the slug on rename', function () {
    actingAsStaffWith(UNI_MANAGE);
    $uni = University::factory()->create(['name' => 'Old Name', 'slug' => 'old-name']);

    $this->patchJson("/api/v1/universities/{$uni->id}", [
        'name' => 'New Name',
        'requirements' => ['Passport'],
    ])
        ->assertOk()
        ->assertJsonPath('data.slug', 'old-name') // rename does not change the slug
        ->assertJsonPath('data.requirements', ['Passport']);
});

it('validates requirements are a list of strings', function () {
    actingAsStaffWith(UNI_MANAGE);

    $this->postJson('/api/v1/universities', [
        'name' => 'Z', 'code' => 'Z1', 'requirements' => [['nested' => 'bad']],
    ])->assertStatus(422);
});

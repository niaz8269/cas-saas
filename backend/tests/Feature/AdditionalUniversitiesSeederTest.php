<?php

use App\Models\University;
use Database\Seeders\AdditionalUniversitiesSeeder;
use Database\Seeders\CountrySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('adds universities that publish international admissions but are not on the CSC list', function () {
    $this->seed(CountrySeeder::class);

    $this->seed(AdditionalUniversitiesSeeder::class);
    $this->seed(AdditionalUniversitiesSeeder::class);

    $yanan = University::where('name', "Yan'an University")->firstOrFail();
    expect($yanan->province)->toBe('Shaanxi')
        ->and(University::where('name', 'Shenyang Medical College')->count())->toBe(1)
        ->and($yanan->programs()->count())->toBe(1);
});

it('keeps majors registered with the Ministry out of the program finder', function () {
    $uni = University::create(['name' => 'Test University', 'name_zh' => '测试大学', 'code' => 'TU1', 'slug' => 'test-university', 'status' => 'active']);
    $uni->programs()->create(['name' => 'Data Science', 'level' => 'bachelor', 'registry_only' => true, 'status' => 'active']);
    $uni->programs()->create(['name' => 'MBBS', 'level' => 'bachelor', 'status' => 'active']);

    $finder = $this->getJson('/api/v1/public/programs')->assertOk()->json('data');
    $page = $this->getJson('/api/v1/public/programs?filter[university_slug]=test-university')->assertOk()->json('data');

    expect(collect($finder)->pluck('name')->all())->toBe(['MBBS'])
        ->and(collect($page)->pluck('name')->sort()->values()->all())->toBe(['Data Science', 'MBBS'])
        ->and(collect($page)->firstWhere('name', 'Data Science')['registry_only'])->toBeTrue();
});

it('turns a registered major into a confirmed program once staff save it', function () {
    $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    $admin = \App\Models\User::factory()->create(['status' => 'active']);
    $admin->assignRole('Super Admin');
    $uni = University::create(['name' => 'Test University', 'code' => 'TU2', 'status' => 'active']);
    $program = $uni->programs()->create(['name' => 'Data Science', 'level' => 'bachelor', 'registry_only' => true, 'status' => 'active']);

    \Laravel\Sanctum\Sanctum::actingAs($admin, ['*'], 'staff');
    $this->putJson("/api/v1/programs/{$program->id}", ['teaching_language' => 'English', 'tuition_fee' => 20000])->assertOk();

    expect($program->fresh()->registry_only)->toBeFalse();
});

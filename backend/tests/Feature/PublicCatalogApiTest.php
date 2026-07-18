<?php

use App\Models\Intake;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Models\UniversityAgreement;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('is publicly accessible without authentication', function () {
    University::factory()->create(['status' => 'active']);

    $this->getJson('/api/v1/public/universities')->assertOk();
});

it('lists only active universities with website-safe fields', function () {
    University::factory()->create(['name' => 'Jilin Medical University', 'status' => 'active', 'moe_listed' => true]);
    University::factory()->create(['name' => 'Hidden University', 'status' => 'inactive']);

    $this->getJson('/api/v1/public/universities')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Jilin Medical University')
        ->assertJsonPath('data.0.moe_listed', true)
        // internal fields are absent
        ->assertJsonMissingPath('data.0.agreements_count')
        ->assertJsonMissingPath('data.0.status')
        ->assertJsonMissingPath('data.0.created_by');
});

it('filters by search term and moe_listed', function () {
    University::factory()->create(['name' => 'Alpha Medical', 'city' => 'Dalian', 'status' => 'active', 'moe_listed' => true]);
    University::factory()->create(['name' => 'Beta Tech', 'city' => 'Beijing', 'status' => 'active', 'moe_listed' => false]);

    $this->getJson('/api/v1/public/universities?q=Dalian')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Alpha Medical');

    $this->getJson('/api/v1/public/universities?filter[moe_listed]=1')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Alpha Medical');
});

it('shows a university by slug with only active programs, open intakes and active scholarships', function () {
    $uni = University::factory()->create([
        'name' => 'Jilin Medical University', 'slug' => 'jilin-medical-university', 'status' => 'active',
        'requirements' => ['IELTS 6.0'],
    ]);

    $mbbs = Program::factory()->for($uni)->create(['name' => 'MBBS', 'status' => 'active', 'teaching_language' => 'English']);
    Program::factory()->for($uni)->create(['name' => 'Archived Program', 'status' => 'inactive']);

    Intake::factory()->for($uni)->create(['name' => 'Sept 2026', 'status' => 'open', 'program_id' => $mbbs->id]);
    Intake::factory()->for($uni)->create(['name' => 'Closed', 'status' => 'closed']);

    Scholarship::factory()->for($uni)->create(['name' => 'Merit Award', 'status' => 'active', 'amount' => 8000, 'currency' => 'CNY']);
    Scholarship::factory()->for($uni)->create(['name' => 'Retired Award', 'status' => 'inactive']);

    // A commission agreement must never surface publicly.
    UniversityAgreement::factory()->for($uni)->create();

    $data = $this->getJson('/api/v1/public/universities/jilin-medical-university')
        ->assertOk()
        ->assertJsonPath('data.name', 'Jilin Medical University')
        ->assertJsonPath('data.requirements', ['IELTS 6.0'])
        ->assertJsonMissingPath('data.agreements')
        ->json('data');

    expect(collect($data['programs'])->pluck('name'))->toEqual(collect(['MBBS']))
        ->and($data['programs'][0]['teaching_language'])->toBe('English')
        ->and(collect($data['intakes'])->pluck('name'))->toEqual(collect(['Sept 2026']))
        ->and($data['intakes'][0]['program'])->toBe('MBBS')
        ->and(collect($data['scholarships'])->pluck('name'))->toEqual(collect(['Merit Award']));
});

it('404s for an inactive or unknown slug', function () {
    University::factory()->create(['slug' => 'hidden-uni', 'status' => 'inactive']);

    $this->getJson('/api/v1/public/universities/hidden-uni')->assertNotFound();
    $this->getJson('/api/v1/public/universities/does-not-exist')->assertNotFound();
});

it('finds programs across active universities with filters', function () {
    $active = University::factory()->create(['name' => 'Jilin Medical', 'slug' => 'jilin-medical', 'status' => 'active']);
    $hidden = University::factory()->create(['status' => 'inactive']);

    Program::factory()->for($active)->create(['name' => 'MBBS', 'level' => 'bachelor', 'teaching_language' => 'English', 'tuition_fee' => 30000, 'status' => 'active']);
    Program::factory()->for($active)->create(['name' => 'Master of Surgery', 'level' => 'master', 'tuition_fee' => 45000, 'status' => 'active']);
    Program::factory()->for($active)->create(['name' => 'Archived', 'status' => 'inactive']);
    Program::factory()->for($hidden)->create(['name' => 'Hidden MBBS', 'status' => 'active']); // inactive university

    // All active programs from active universities, cheapest first, with the university attached.
    $data = $this->getJson('/api/v1/public/programs')->assertOk()->assertJsonCount(2, 'data')->json('data');
    expect($data[0]['name'])->toBe('MBBS')
        ->and($data[0]['university']['slug'])->toBe('jilin-medical');

    // Filters: level, budget, search.
    $this->getJson('/api/v1/public/programs?filter[level]=master')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Master of Surgery');
    $this->getJson('/api/v1/public/programs?filter[max_fee]=35000')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'MBBS');
    $this->getJson('/api/v1/public/programs?q=surgery')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Master of Surgery');
});

it('lists active scholarships across active universities', function () {
    $active = University::factory()->create(['slug' => 'jilin-medical', 'status' => 'active']);
    $hidden = University::factory()->create(['status' => 'inactive']);

    Scholarship::factory()->for($active)->create(['name' => 'Belt & Road', 'status' => 'active']);
    Scholarship::factory()->for($active)->create(['name' => 'Retired', 'status' => 'inactive']);
    Scholarship::factory()->for($hidden)->create(['name' => 'Hidden Award', 'status' => 'active']);

    $this->getJson('/api/v1/public/scholarships')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Belt & Road')
        ->assertJsonPath('data.0.university.slug', 'jilin-medical');
});

<?php

use App\Models\Intake;
use App\Models\Program;
use App\Models\University;
use App\Services\Catalog\UniversityMerger;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\get;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['seo.site_url' => 'https://example.test', 'seo.index_path' => '/nonexistent']);
});

function renamedPair(): array
{
    $old = University::factory()->create(['name' => 'Xinxiang Medical University', 'name_zh' => '新乡医学院', 'slug' => 'xinxiang-medical-university', 'status' => 'active', 'city' => 'Xinxiang', 'website' => 'https://www.xxmu.edu.cn']);
    $new = University::factory()->create(['name' => 'Henan Medical University', 'name_zh' => '河南医药大学', 'slug' => 'henan-medical-university', 'status' => 'active', 'city' => 'Xinxiang', 'website' => null, 'about' => 'A medical university.']);

    return [$old, $new];
}

it('moves programs and intakes to the renamed university, skips duplicates and keeps the old record restorable', function () {
    [$old, $new] = renamedPair();
    Program::factory()->create(['university_id' => $old->id, 'name' => 'Clinical Medicine', 'level' => 'bachelor']);
    Program::factory()->create(['university_id' => $old->id, 'name' => 'Nursing', 'level' => 'bachelor']);
    Program::factory()->create(['university_id' => $new->id, 'name' => 'Nursing', 'level' => 'bachelor']);
    Intake::factory()->create(['university_id' => $old->id, 'name' => 'Application window']);

    $moved = app(UniversityMerger::class)->merge('xinxiang-medical-university', 'henan-medical-university');

    expect($moved)->toEqual(['programs' => 1, 'intakes' => 1])
        ->and(Program::where('university_id', $new->id)->pluck('name')->sort()->values()->all())->toBe(['Clinical Medicine', 'Nursing'])
        ->and(Intake::where('university_id', $new->id)->count())->toBe(1)
        ->and(University::find($old->id))->toBeNull()
        ->and(University::withTrashed()->find($old->id))->not->toBeNull()
        ->and($new->refresh()->website)->toBe('https://www.xxmu.edu.cn');

    // Running it again changes nothing.
    expect(app(UniversityMerger::class)->merge('xinxiang-medical-university', 'henan-medical-university'))->toBe([]);
});

it('sends the old university address to the new page with a permanent redirect', function () {
    renamedPair();
    app(UniversityMerger::class)->merge('xinxiang-medical-university', 'henan-medical-university');

    get('/site/universities/xinxiang-medical-university')->assertStatus(301)->assertRedirect('/site/universities/henan-medical-university');
    get('/site/universities/henan-medical-university')->assertOk()->assertSee('Henan Medical University');
});

it('does nothing when one of the two records is missing', function () {
    University::factory()->create(['slug' => 'henan-medical-university']);

    expect(app(UniversityMerger::class)->merge('xinxiang-medical-university', 'henan-medical-university'))->toBe([]);
});

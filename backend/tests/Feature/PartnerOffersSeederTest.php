<?php

use App\Models\Intake;
use App\Models\Program;
use App\Models\University;
use Database\Seeders\PartnerOffersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

/** Write a one-off offers file and run the seeder against it. */
function runOffers(array $universities): void
{
    $path = sys_get_temp_dir().'/offers-'.uniqid().'.json';
    File::put($path, json_encode(['universities' => $universities]));

    (new PartnerOffersSeeder($path))->run();

    File::delete($path);
}

function offer(string $name, array $over = []): array
{
    return array_merge([
        'name' => $name, 'level' => 'bachelor', 'duration_months' => 72, 'tuition_fee' => 20000, 'hostel_fee' => 3000,
        'min_age' => null, 'max_age' => null, 'intakes' => [], 'application_deadline' => null, 'note' => 'ignored',
    ], $over);
}

it('adds programs with their fees and duration, and never records a teaching medium', function () {
    $uni = University::factory()->create(['name' => 'Test Medical University']);

    runOffers([['university' => 'Test Medical University', 'programs' => [offer('Clinical Medicine (MBBS)', ['min_age' => 18, 'max_age' => 25])]]]);

    $p = Program::where('university_id', $uni->id)->sole();

    expect($p->name)->toBe('Clinical Medicine (MBBS)')
        ->and($p->level)->toBe('bachelor')
        ->and($p->duration_months)->toBe(72)
        ->and((float) $p->tuition_fee)->toBe(20000.0)
        ->and((float) $p->hostel_fee)->toBe(3000.0)
        ->and($p->currency)->toBe('CNY')
        ->and($p->teaching_language)->toBeNull()
        ->and($p->registry_only)->toBeFalse()
        ->and($p->status)->toBe('active')
        ->and($p->requirements)->toBe(['min_age' => 18, 'max_age' => 25]);
});

it('leaves a program the catalog already has exactly as it is', function () {
    $uni = University::factory()->create(['name' => 'Test Medical University']);
    $official = Program::factory()->create([
        'university_id' => $uni->id, 'name' => 'Clinical Medicine', 'level' => 'bachelor',
        'tuition_fee' => 32000, 'teaching_language' => 'Chinese', 'registry_only' => false,
    ]);

    // "(MBBS)" and a different fee must not create a duplicate or change the official row.
    runOffers([['university' => 'Test Medical University', 'programs' => [offer('Clinical Medicine (MBBS)', ['tuition_fee' => 1])]]]);

    expect(Program::where('university_id', $uni->id)->count())->toBe(1)
        ->and((float) $official->refresh()->tuition_fee)->toBe(32000.0)
        ->and($official->teaching_language)->toBe('Chinese');
});

it('upgrades a Ministry registry-only placeholder instead of duplicating it', function () {
    $uni = University::factory()->create(['name' => 'Test University']);
    $placeholder = Program::factory()->create([
        'university_id' => $uni->id, 'name' => 'Stomatology', 'level' => 'bachelor',
        'registry_only' => true, 'tuition_fee' => null, 'teaching_language' => null,
    ]);

    runOffers([['university' => 'Test University', 'programs' => [offer('Stomatology (BDS)', ['tuition_fee' => 22000])]]]);

    expect(Program::where('university_id', $uni->id)->count())->toBe(1)
        ->and($placeholder->refresh()->registry_only)->toBeFalse()
        ->and((float) $placeholder->tuition_fee)->toBe(22000.0);
});

it('skips a university that is not in the catalog without failing', function () {
    runOffers([['university' => 'No Such University', 'programs' => [offer('Clinical Medicine')]]]);

    expect(Program::count())->toBe(0);
});

it('is idempotent', function () {
    University::factory()->create(['name' => 'Test University']);
    $data = [['university' => 'Test University', 'programs' => [offer('Tourism Management', ['intakes' => ['September 2099']])]]];

    runOffers($data);
    runOffers($data);

    expect(Program::count())->toBe(1)->and(Intake::count())->toBe(1);
});

it('records intakes as closed once their month has begun and open while still ahead', function () {
    University::factory()->create(['name' => 'Test University']);

    runOffers([['university' => 'Test University', 'programs' => [
        offer('Past Intake Program', ['intakes' => ['September 2020']]),
        offer('Future Intake Program', ['intakes' => ['March 2099']]),
        offer('Expired Deadline Program', ['intakes' => ['June 2099'], 'application_deadline' => '2020-10-30']),
    ]]]);

    $status = fn (string $name) => Intake::where('name', $name.' intake')->value('status');

    expect($status('September 2020'))->toBe('closed')
        ->and($status('March 2099'))->toBe('open')
        ->and($status('June 2099'))->toBe('closed');
});

it('ships a data file the importer can use', function () {
    $data = json_decode(file_get_contents(database_path('data/partner_offers_2026.json')), true);

    expect($data['universities'])->not->toBeEmpty();

    foreach ($data['universities'] as $entry) {
        expect($entry['university'])->toBeString()->not->toBe('');

        foreach ($entry['programs'] as $p) {
            expect($p['name'])->toBeString()->not->toBe('')
                ->and($p['level'])->toBeIn(['bachelor', 'master', 'phd', 'diploma', 'non_degree'])
                ->and($p)->not->toHaveKey('teaching_language');

            foreach (['tuition_fee', 'hostel_fee'] as $fee) {
                if ($p[$fee] !== null) {
                    expect($p[$fee])->toBeInt()->toBeGreaterThan(0);
                }
            }
        }
    }
});

it('records one shared intake per university and month, not one per program', function () {
    $uni = University::factory()->create(['name' => 'Test University']);

    runOffers([['university' => 'Test University', 'programs' => [
        offer('Program A', ['intakes' => ['March 2099']]),
        offer('Program B', ['intakes' => ['March 2099']]),
    ]]]);

    expect(Intake::where('university_id', $uni->id)->count())->toBe(1)
        ->and(Intake::where('university_id', $uni->id)->value('program_id'))->toBeNull();
});

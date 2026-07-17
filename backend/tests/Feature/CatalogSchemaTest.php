<?php

use App\Models\Intake;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Models\UniversityAgreement;
use App\Models\UniversityContact;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('creates every catalog table from schema.sql', function () {
    foreach ([
        'universities', 'university_contacts', 'programs',
        'intakes', 'scholarships', 'university_agreements',
    ] as $table) {
        expect(Schema::hasTable($table))->toBeTrue("missing table: {$table}");
    }
});

it('adds the ADR-0006 program fields', function () {
    expect(Schema::hasColumns('programs', ['teaching_language', 'apply_link']))->toBeTrue();
});

it('shapes university_agreements per the commission contract', function () {
    expect(Schema::hasColumns('university_agreements', [
        'id', 'university_id', 'program_id', 'commission_type', 'commission_value',
        'currency', 'eligibility_trigger', 'valid_from', 'valid_to',
    ]))->toBeTrue();
});

it('builds a full catalog graph via factories', function () {
    $university = University::factory()
        ->has(UniversityContact::factory()->count(2), 'contacts')
        ->has(Program::factory()->count(3), 'programs')
        ->has(Scholarship::factory(), 'scholarships')
        ->create();

    $program = $university->programs->first();
    Intake::factory()->for($university)->for($program)->create();
    UniversityAgreement::factory()->for($university)->create(['commission_type' => 'percent', 'commission_value' => 15]);

    expect($university->contacts)->toHaveCount(2)
        ->and($university->programs)->toHaveCount(3)
        ->and($university->fresh()->intakes)->toHaveCount(1)
        ->and($university->agreements()->first()->commission_value)->toBe('15.00')
        ->and($program->intakes)->toHaveCount(1);
});

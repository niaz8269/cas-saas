<?php

use App\Models\DocumentType;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Services\Admissions\ApplicationCatalog;
use Database\Seeders\ApplicationDocumentsSeeder;
use Database\Seeders\DocumentTypeSeeder;
use Database\Seeders\PostgraduateScholarshipDocumentsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([DocumentTypeSeeder::class, PostgraduateScholarshipDocumentsSeeder::class, ApplicationDocumentsSeeder::class]);
});

function programOfLevel(string $level): Program
{
    return Program::factory()->create([
        'university_id' => University::factory()->create(['status' => 'active'])->id,
        'level' => $level,
        'requirements' => [],
        'status' => 'active',
    ]);
}

function documentNames($types): array
{
    return $types->pluck('name')->sort()->values()->all();
}

function sorted(array $names): array
{
    return collect($names)->sort()->values()->all();
}

it('asks a Bachelor application for the nine bachelor documents', function () {
    $required = documentNames(app(ApplicationCatalog::class)->requiredDocuments(programOfLevel('bachelor')));

    expect($required)->toBe(sorted([
        'Passport', 'Notarized High School Diploma', 'Academic Transcript', 'Study Plan / Statement of Purpose',
        'Medical Examination Form', 'Police Clearance Certificate', 'Language Proficiency Certificate', 'CSCA Score Report', 'Passport Photo',
    ]));
});

it('asks a Master or PhD application, funded or not, for the ten postgraduate documents and lists two as optional', function (string $level, bool $scholarship) {
    $catalog = app(ApplicationCatalog::class);
    $program = programOfLevel($level);
    $award = $scholarship ? Scholarship::factory()->create() : null;

    expect(documentNames($catalog->requiredDocuments($program, $award)))->toBe(sorted([
        'Passport', 'Passport Photo', 'Notarized Degree Certificates', 'Notarized Final Transcripts', 'English Proficiency Letter',
        'Recommendation Letters', 'Study Plan / Personal Statement', 'Medical Examination Form', 'CV / Resume', 'Police Clearance Certificate',
    ]))
        ->and(documentNames($catalog->optionalDocuments($program, $award)))->toBe(['Experience Letter', 'Research Papers / Thesis']);
})->with([['master', false], ['phd', false], ['master', true], ['phd', true]]);

it('keeps the optional documents off bachelor applications and the old baseline for other levels', function () {
    $catalog = app(ApplicationCatalog::class);

    expect($catalog->optionalDocuments(programOfLevel('bachelor')))->toBeEmpty()
        ->and(documentNames($catalog->requiredDocuments(programOfLevel('diploma'))))
        ->toBe(['Academic Transcript', 'Passport', 'Passport Photo', 'School Leaving Certificate']);
});

it('does not duplicate the document types when the seeder is run again', function () {
    $before = DocumentType::count();
    $this->seed(ApplicationDocumentsSeeder::class);

    expect(DocumentType::count())->toBe($before);
});

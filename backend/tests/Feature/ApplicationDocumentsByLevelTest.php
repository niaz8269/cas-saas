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

it('asks a Bachelor application for its documents, in the order the applicant should see them', function () {
    $required = app(ApplicationCatalog::class)->requiredDocuments(programOfLevel('bachelor'))->pluck('name')->all();

    expect($required)->toBe([
        'Photo', 'Passport', 'Passport Blank Visa Page', 'High School Diploma/Certificate', 'High School Transcript',
        'Medical Examination Form', 'Police Clearance Certificate', 'English Proficiency Certificate', 'Study Plan', 'CSCA',
    ]);
});

it('asks a Master or PhD application, funded or not, for its documents in order, with two extra ones listed after', function (string $level, bool $scholarship) {
    $catalog = app(ApplicationCatalog::class);
    $program = programOfLevel($level);
    $award = $scholarship ? Scholarship::factory()->create() : null;

    expect($catalog->requiredDocuments($program, $award)->pluck('name')->all())->toBe([
        'Photo', 'Passport', 'Passport Blank Visa Page', 'Notarized Degree Certificates', 'Notarized Final Transcripts',
        'English Proficiency Letter', 'Recommendation Letters', 'Study Plan / Personal Statement', 'Medical Examination Form',
        'CV / Resume', 'Police Clearance Certificate',
    ])
        ->and($catalog->optionalDocuments($program, $award)->pluck('name')->all())->toBe(['Experience Letter', 'Research Papers / Thesis']);
})->with([['master', false], ['phd', false], ['master', true], ['phd', true]]);

it('keeps the optional documents off bachelor applications and the old baseline for other levels', function () {
    $catalog = app(ApplicationCatalog::class);

    expect($catalog->optionalDocuments(programOfLevel('bachelor')))->toBeEmpty()
        ->and(documentNames($catalog->requiredDocuments(programOfLevel('diploma'))))
        ->toBe(['High School Diploma/Certificate', 'High School Transcript', 'Passport', 'Photo']);
});

it('does not duplicate the document types when the seeder is run again', function () {
    $before = DocumentType::count();
    $this->seed(ApplicationDocumentsSeeder::class);

    expect(DocumentType::count())->toBe($before);
});

it('renames the older document types in place, so uploaded files stay attached', function () {
    $photo = DocumentType::where('name', 'Photo')->firstOrFail();
    $photo->update(['name' => 'Passport Photo']);
    $leaving = DocumentType::where('name', 'High School Diploma/Certificate')->firstOrFail();
    $leaving->update(['name' => 'School Leaving Certificate']);

    $this->seed(ApplicationDocumentsSeeder::class);

    expect($photo->fresh()->name)->toBe('Photo')
        ->and($leaving->fresh()->name)->toBe('High School Diploma/Certificate')
        ->and(DocumentType::where('name', 'Passport Photo')->exists())->toBeFalse();
});

<?php

use App\Models\DocumentType;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\University;
use App\Services\Admissions\ApplicationCatalog;
use Database\Seeders\PostgraduateScholarshipDocumentsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(PostgraduateScholarshipDocumentsSeeder::class));

function postgraduateProgram(string $level): Program
{
    return Program::factory()->create([
        'university_id' => University::factory()->create(['status' => 'active'])->id,
        'level' => $level,
        'status' => 'active',
    ]);
}

function names($types): array
{
    return $types->pluck('name')->all();
}

it('asks a Master or PhD scholarship application for the full document checklist', function (string $level) {
    $scholarship = Scholarship::factory()->create();

    $required = names(app(ApplicationCatalog::class)->requiredDocuments(postgraduateProgram($level), $scholarship));

    expect($required)->toContain(
        'Notarized Degree Certificates', 'Notarized Final Transcripts', 'English Proficiency Letter', 'Recommendation Letters',
        'Study Plan / Personal Statement', 'Medical Examination Form', 'CV / Resume', 'Police Clearance Certificate',
    )->and($required)->not->toContain('Experience Letter', 'Research Papers / Thesis');
})->with(['master', 'phd']);

it('lists the experience letter and research papers as optional, never required', function () {
    $catalog = app(ApplicationCatalog::class);
    $program = postgraduateProgram('master');
    $scholarship = Scholarship::factory()->create();

    expect(names($catalog->optionalDocuments($program, $scholarship)))->toBe(['Experience Letter', 'Research Papers / Thesis'])
        ->and(names($catalog->requiredDocuments($program, $scholarship)))->not->toContain('Experience Letter');
});

it('keeps the checklist off bachelor applications and applications without a scholarship', function () {
    $catalog = app(ApplicationCatalog::class);
    $scholarship = Scholarship::factory()->create();

    expect(names($catalog->requiredDocuments(postgraduateProgram('bachelor'), $scholarship)))->not->toContain('Study Plan / Personal Statement')
        ->and(names($catalog->requiredDocuments(postgraduateProgram('master'), null)))->not->toContain('Study Plan / Personal Statement')
        ->and($catalog->optionalDocuments(postgraduateProgram('master'), null))->toBeEmpty()
        ->and($catalog->optionalDocuments(postgraduateProgram('bachelor'), $scholarship))->toBeEmpty();
});

it('carries a short instruction for the documents that need one', function () {
    $plan = DocumentType::where('name', 'Study Plan / Personal Statement')->firstOrFail();

    expect($plan->instruction)->toContain('800-1000')->toContain('1000-1500');
});

it('can be run again without duplicating or losing anything', function () {
    DocumentType::where('name', 'CV / Resume')->update(['required_for' => ['application']]);

    $this->seed(PostgraduateScholarshipDocumentsSeeder::class);

    expect(DocumentType::where('name', 'Study Plan / Personal Statement')->count())->toBe(1)
        ->and(DocumentType::where('name', 'CV / Resume')->first()->required_for)->toBe(['application', 'scholarship_postgraduate']);
});

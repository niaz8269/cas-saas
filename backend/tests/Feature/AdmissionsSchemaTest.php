<?php

use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Offer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('creates every admissions table from schema.sql', function () {
    foreach ([
        'applications', 'application_status_history',
        'document_types', 'documents', 'document_access_logs', 'offers',
    ] as $table) {
        expect(Schema::hasTable($table))->toBeTrue("missing table: {$table}");
    }
});

it('supports multiple applications per student with immutable history', function () {
    $application = Application::factory()->create();
    $second = Application::factory()->create(['student_id' => $application->student_id]);

    ApplicationStatusHistory::create([
        'application_id' => $application->id,
        'from_status' => null,
        'to_status' => 'draft',
        'created_at' => now(),
    ]);

    expect($application->student->id)->toBe($second->student->id)
        ->and(Application::where('student_id', $application->student_id)->count())->toBe(2)
        ->and($application->statusHistory)->toHaveCount(1);
});

it('links polymorphic documents with types and required-for scoping', function () {
    $application = Application::factory()->create();
    $passport = DocumentType::factory()->requiredForApplication()->sensitive()->create(['name' => 'Passport']);

    $document = Document::factory()
        ->for($passport, 'type')
        ->create(['documentable_type' => Application::class, 'documentable_id' => $application->id]);

    expect($application->documents)->toHaveCount(1)
        ->and($application->documents->first()->type->is_sensitive)->toBeTrue()
        ->and(DocumentType::requiredFor('application')->pluck('name'))->toContain('Passport')
        ->and($document->documentable->id)->toBe($application->id);
});

it('attaches offers to applications', function () {
    $offer = Offer::factory()->create();

    expect($offer->application)->not->toBeNull()
        ->and($offer->application->offers)->toHaveCount(1);
});

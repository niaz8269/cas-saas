<?php

use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lists a students own documents, scoped', function () {
    $user = actingAsStaffWith(['students.view.global']);
    $student = Student::factory()->create();
    $type = DocumentType::factory()->create(['name' => 'Passport']);

    Document::factory()->count(2)->create([
        'documentable_type' => Student::class, 'documentable_id' => $student->id, 'document_type_id' => $type->id,
    ]);
    // Another student's document must not appear.
    Document::factory()->create([
        'documentable_type' => Student::class, 'documentable_id' => Student::factory()->create()->id, 'document_type_id' => $type->id,
    ]);

    $this->getJson("/api/v1/students/{$student->id}/documents")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.type.name', 'Passport');
});

it('denies student documents without view scope', function () {
    actingAsStaffWith([]);
    $student = Student::factory()->create();

    $this->getJson("/api/v1/students/{$student->id}/documents")->assertForbidden();
});

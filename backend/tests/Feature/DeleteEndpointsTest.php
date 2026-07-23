<?php

use App\Models\Application;
use App\Models\Document;
use App\Models\Lead;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
 * leads/students/applications/documents.delete were granted to Admin but
 * had no route or controller method — dead permissions. They now soft-delete
 * (recoverable) behind the matching *.delete.global gate.
 */

it('soft-deletes a lead for an authorized user', function () {
    actingAsStaffWith(['leads.delete.global']);
    $lead = Lead::factory()->create();

    $this->deleteJson("/api/v1/leads/{$lead->id}")->assertOk();
    $this->assertSoftDeleted('leads', ['id' => $lead->id]);
});

it('soft-deletes a student for an authorized user', function () {
    actingAsStaffWith(['students.delete.global']);
    $student = Student::factory()->create();

    $this->deleteJson("/api/v1/students/{$student->id}")->assertOk();
    $this->assertSoftDeleted('students', ['id' => $student->id]);
});

it('soft-deletes an application for an authorized user', function () {
    actingAsStaffWith(['applications.delete.global']);
    $application = Application::factory()->create();

    $this->deleteJson("/api/v1/applications/{$application->id}")->assertOk();
    $this->assertSoftDeleted('applications', ['id' => $application->id]);
});

it('soft-deletes a document for an authorized user', function () {
    actingAsStaffWith(['documents.delete.global']);
    $document = Document::factory()->create();

    $this->deleteJson("/api/v1/documents/{$document->id}")->assertOk();
    $this->assertSoftDeleted('documents', ['id' => $document->id]);
});

it('denies deletion without the matching delete permission', function () {
    actingAsStaffWith(['leads.view.global', 'applications.view.global']);
    $lead = Lead::factory()->create();
    $application = Application::factory()->create();

    $this->deleteJson("/api/v1/leads/{$lead->id}")->assertStatus(403);
    $this->deleteJson("/api/v1/applications/{$application->id}")->assertStatus(403);
    $this->assertDatabaseHas('leads', ['id' => $lead->id, 'deleted_at' => null]);
});

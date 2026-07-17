<?php

use App\Models\Application;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\VisaCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

it('requires the student guard', function () {
    $this->getJson('/api/v1/student/applications')->assertUnauthorized();
});

it('lists only the students own applications with offers and progress', function () {
    $student = actingAsStudentPortal();

    $mine = Application::factory()->create(['student_id' => $student->id, 'status' => 'offer_received']);
    $mine->offers()->create(['offer_type' => 'unconditional', 'reference_no' => 'OFR-1', 'status' => 'issued']);
    Application::factory()->create(); // someone else's

    $this->getJson('/api/v1/student/applications')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.application_code', $mine->application_code)
        ->assertJsonCount(1, 'data.0.offers')
        // internal attribution is never exposed
        ->assertJsonMissingPath('data.0.assigned_admissions_id')
        ->assertJsonMissingPath('data.0.agent_id');
});

it('returns the students own visa case with checklist', function () {
    $student = actingAsStudentPortal();
    $case = VisaCase::factory()->create(['student_id' => $student->id, 'status' => 'appointment_booked']);
    $case->checklistItems()->create(['name' => 'Passport', 'is_required' => true, 'status' => 'verified']);

    $this->getJson('/api/v1/student/visa-case')
        ->assertOk()
        ->assertJsonPath('data.status', 'appointment_booked')
        ->assertJsonCount(1, 'data.checklist')
        ->assertJsonMissingPath('data.assigned_visa_officer_id');
});

it('404s when the student has no visa case', function () {
    actingAsStudentPortal();

    $this->getJson('/api/v1/student/visa-case')->assertNotFound();
});

it('shows only the students own invoices and receipts, never commission data', function () {
    $student = actingAsStudentPortal();

    $mine = Invoice::factory()->create([
        'party_type' => 'student', 'party_id' => $student->id, 'total' => 30000, 'status' => 'partially_paid',
    ]);
    $mine->payments()->create([
        'payment_no' => 'PAY-1', 'amount' => 12000, 'currency' => 'CNY', 'method' => 'bank_transfer',
    ]);
    // A university (commission) invoice for the same application must never surface.
    Invoice::factory()->create(['party_type' => 'university', 'party_id' => 99, 'application_id' => $mine->application_id]);
    // Another student's invoice.
    Invoice::factory()->create(['party_type' => 'student', 'party_id' => 999]);

    $this->getJson('/api/v1/student/invoices')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.invoice_no', $mine->invoice_no)
        ->assertJsonCount(1, 'data.0.receipts');
});

it('presigns and registers an upload against the student only', function () {
    Storage::fake('s3');
    $student = actingAsStudentPortal();
    $type = DocumentType::factory()->create();

    $presign = $this->postJson('/api/v1/student/documents/presign', [
        'document_type_id' => $type->id,
        'file_name' => 'my passport.pdf',
        'mime' => 'application/pdf',
        'size' => 100_000,
    ])->assertOk()->json();

    expect($presign['key'])->toStartWith("students/{$student->id}/");

    $this->postJson('/api/v1/student/documents', [
        'document_type_id' => $type->id,
        'key' => $presign['key'],
        'file_name' => 'my passport.pdf',
        'mime' => 'application/pdf',
        'size' => 100_000,
    ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonMissingPath('data.file_path'); // storage key never exposed

    $document = Document::first();
    expect($document->documentable_type)->toBe(Student::class)
        ->and($document->documentable_id)->toBe($student->id)
        ->and($document->created_by)->toBeNull(); // portal upload, no staff actor
});

it('rejects a storage key outside the students prefix', function () {
    Storage::fake('s3');
    $student = actingAsStudentPortal();
    $type = DocumentType::factory()->create();

    $this->postJson('/api/v1/student/documents', [
        'document_type_id' => $type->id,
        'key' => 'students/999999/forged.pdf',
        'file_name' => 'forged.pdf',
        'mime' => 'application/pdf',
        'size' => 100_000,
    ])->assertStatus(422);

    expect(Document::count())->toBe(0);
});

it('downloads only the students own documents', function () {
    Storage::fake('s3');
    $student = actingAsStudentPortal();
    $type = DocumentType::factory()->create();

    $mine = Document::factory()->create([
        'documentable_type' => Student::class, 'documentable_id' => $student->id,
        'document_type_id' => $type->id,
    ]);
    $foreign = Document::factory()->create([
        'documentable_type' => Student::class, 'documentable_id' => Student::factory()->create()->id,
        'document_type_id' => $type->id,
    ]);

    $this->getJson("/api/v1/student/documents/{$mine->id}/download")
        ->assertOk()
        ->assertJsonStructure(['url', 'expires_at']);

    $this->getJson("/api/v1/student/documents/{$foreign->id}/download")
        ->assertNotFound();
});

<?php

use App\Models\Application;
use App\Models\Branch;
use App\Models\Document;
use App\Models\DocumentAccessLog;
use App\Models\DocumentType;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

const DOC_UPLOADER_PERMS = [
    'documents.view.assigned', 'documents.upload.assigned',
    'applications.view.assigned', 'students.view.assigned',
];
const DOC_ADMIN_PERMS = [
    'documents.view.global', 'documents.upload.global', 'documents.verify.global',
    'applications.view.global', 'students.view.global',
];

function mockS3(): void
{
    Storage::shouldReceive('disk')->with('s3')->andReturn($disk = Mockery::mock());
    $disk->shouldReceive('temporaryUploadUrl')->andReturn([
        'url' => 'http://minio.test/presigned-put',
        'headers' => [],
    ]);
    $disk->shouldReceive('temporaryUrl')->andReturn('http://minio.test/presigned-get');
}

/**
 * @return array{application: Application, counselor: User}
 */
function counselorApplication(array $perms = DOC_UPLOADER_PERMS): array
{
    $counselor = actingAsStaffWith($perms);
    $student = Student::factory()->create(['assigned_counselor_id' => $counselor->id]);
    $application = Application::factory()->create(['student_id' => $student->id]);

    return ['application' => $application, 'counselor' => $counselor];
}

it('presigns an upload for the assigned counselor', function () {
    mockS3();
    ['application' => $application] = counselorApplication();
    $type = DocumentType::factory()->create();

    $response = $this->postJson('/api/v1/documents/presign', [
        'documentable_type' => 'application',
        'documentable_id' => $application->id,
        'document_type_id' => $type->id,
        'file_name' => 'My Passport Scan.pdf',
        'mime' => 'application/pdf',
        'size' => 1_500_000,
    ])->assertOk();

    expect($response->json('url'))->toBe('http://minio.test/presigned-put')
        ->and($response->json('key'))->toStartWith("students/{$application->student_id}/applications/{$application->id}/")
        ->and($response->json('key'))->toEndWith('.pdf');
});

it('rejects oversized files and unsupported mimes', function () {
    ['application' => $application] = counselorApplication();
    $type = DocumentType::factory()->create();

    $base = [
        'documentable_type' => 'application',
        'documentable_id' => $application->id,
        'document_type_id' => $type->id,
        'file_name' => 'x.pdf',
    ];

    $this->postJson('/api/v1/documents/presign', [...$base, 'mime' => 'application/pdf', 'size' => 26 * 1024 * 1024])
        ->assertStatus(422)->assertJsonValidationErrors(['size']);

    $this->postJson('/api/v1/documents/presign', [...$base, 'mime' => 'application/x-msdownload', 'size' => 1000])
        ->assertStatus(422)->assertJsonValidationErrors(['mime']);
});

it('registers uploads with versioning and an upload access log', function () {
    ['application' => $application] = counselorApplication();
    $type = DocumentType::factory()->create();
    $prefix = "students/{$application->student_id}/applications/{$application->id}/";

    $payload = [
        'documentable_type' => 'application',
        'documentable_id' => $application->id,
        'document_type_id' => $type->id,
        'file_name' => 'passport.pdf',
        'mime' => 'application/pdf',
        'size' => 1000,
    ];

    $first = $this->postJson('/api/v1/documents', [...$payload, 'key' => $prefix.'aaa_passport.pdf'])
        ->assertCreated();
    $second = $this->postJson('/api/v1/documents', [...$payload, 'key' => $prefix.'bbb_passport.pdf'])
        ->assertCreated();

    expect($first->json('data.version'))->toBe(1)
        ->and($second->json('data.version'))->toBe(2)
        ->and(DocumentAccessLog::where('action', 'upload')->count())->toBe(2);
});

it('registers documents directly on a student', function () {
    $counselor = actingAsStaffWith(DOC_UPLOADER_PERMS);
    $student = Student::factory()->create(['assigned_counselor_id' => $counselor->id]);
    $type = DocumentType::factory()->create();

    $this->postJson('/api/v1/documents', [
        'documentable_type' => 'student',
        'documentable_id' => $student->id,
        'document_type_id' => $type->id,
        'file_name' => 'photo.png',
        'mime' => 'image/png',
        'size' => 2000,
        'key' => "students/{$student->id}/ccc_photo.png",
    ])->assertCreated();

    expect($student->documents()->count())->toBe(1);
});

it('rejects keys outside the documentable prefix', function () {
    ['application' => $application] = counselorApplication();
    $type = DocumentType::factory()->create();

    $this->postJson('/api/v1/documents', [
        'documentable_type' => 'application',
        'documentable_id' => $application->id,
        'document_type_id' => $type->id,
        'file_name' => 'sneaky.pdf',
        'mime' => 'application/pdf',
        'size' => 1000,
        'key' => 'students/999999/applications/999999/foreign.pdf',
    ])->assertStatus(422);
});

it('returns a download url and logs the access', function () {
    mockS3();
    ['application' => $application] = counselorApplication();
    $document = Document::factory()->create([
        'documentable_type' => Application::class,
        'documentable_id' => $application->id,
    ]);

    $response = $this->getJson("/api/v1/documents/{$document->id}/download")->assertOk();

    expect($response->json('url'))->toBe('http://minio.test/presigned-get')
        ->and(DocumentAccessLog::where('document_id', $document->id)->where('action', 'download')->exists())->toBeTrue();
});

it('blocks documents on applications the user cannot see', function () {
    actingAsStaffWith(DOC_UPLOADER_PERMS);
    $foreign = Document::factory()->create(); // application of another counselor's student

    $this->getJson("/api/v1/documents/{$foreign->id}/download")->assertStatus(403);
});

it('keeps sensitive documents away from branch-scope viewers', function () {
    $viewer = actingAsStaffWith([
        'documents.view.branch', 'applications.view.branch', 'students.view.branch',
    ]);
    $viewer->update(['branch_id' => Branch::factory()->create()->id]);
    $viewer->refresh();

    $student = Student::factory()->create(['branch_id' => $viewer->branch_id]);
    $application = Application::factory()->create(['student_id' => $student->id]);
    $sensitiveType = DocumentType::factory()->sensitive()->create();
    $document = Document::factory()->for($sensitiveType, 'type')->create([
        'documentable_type' => Application::class,
        'documentable_id' => $application->id,
    ]);

    $this->getJson("/api/v1/documents/{$document->id}/download")->assertStatus(403);
});

it('verifies and rejects documents behind documents.verify.global', function () {
    $admin = actingAsStaffWith(DOC_ADMIN_PERMS);
    $document = Document::factory()->create();

    $this->postJson("/api/v1/documents/{$document->id}/verify")
        ->assertOk()
        ->assertJsonPath('data.status', 'verified')
        ->assertJsonPath('data.verified_by', $admin->name);

    $other = Document::factory()->create();
    $this->postJson("/api/v1/documents/{$other->id}/reject")
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected');
});

it('denies verification without the permission', function () {
    ['application' => $application] = counselorApplication();
    $document = Document::factory()->create([
        'documentable_type' => Application::class,
        'documentable_id' => $application->id,
    ]);

    $this->postJson("/api/v1/documents/{$document->id}/verify")->assertStatus(403);
});

it('lists document types for checklist configuration', function () {
    actingAsStaffWith(DOC_UPLOADER_PERMS);
    DocumentType::factory()->requiredForApplication()->create(['name' => 'Passport']);
    DocumentType::factory()->create(['name' => 'Bank Statement']);

    $this->getJson('/api/v1/document-types')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Bank Statement');
});

it('lists application documents for the checklist section', function () {
    ['application' => $application] = counselorApplication();
    Document::factory()->count(2)->create([
        'documentable_type' => Application::class,
        'documentable_id' => $application->id,
    ]);

    $this->getJson("/api/v1/applications/{$application->id}/documents")
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

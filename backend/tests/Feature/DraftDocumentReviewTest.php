<?php

use App\Models\Application;
use App\Models\Document;
use App\Models\DocumentAccessLog;
use App\Models\DocumentType;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function draftWithFiles(int $studentId, int $count = 2): array
{
    $type = DocumentType::firstOrCreate(['name' => 'Recommendation Letters']);
    $application = Application::factory()->create(['student_id' => $studentId, 'status' => 'draft']);
    $documents = collect(range(1, $count))->map(fn ($n) => Document::factory()->create([
        'documentable_type' => Application::class, 'documentable_id' => $application->id,
        'document_type_id' => $type->id, 'file_name' => "letter-{$n}.pdf", 'mime' => 'application/pdf', 'version' => $n,
    ]));

    return [$application, $type, $documents];
}

it('lists every file uploaded on a draft, several per document type', function () {
    $student = actingAsStudentPortal();
    [$application, $type] = draftWithFiles($student->id);

    $response = $this->getJson("/api/v1/student/applications/{$application->id}/documents")->assertOk();

    expect($response->json('data'))->toHaveCount(2)
        ->and(collect($response->json('data'))->pluck('document_type_id')->unique()->all())->toBe([$type->id])
        ->and(collect($response->json('data'))->pluck('file_name')->all())->toBe(['letter-1.pdf', 'letter-2.pdf'])
        ->and($response->json('data.0'))->not->toHaveKey('file_path');
});

it('gives a short-lived link to look at one file and logs the view', function () {
    Storage::fake('s3');
    $student = actingAsStudentPortal();
    [$application, , $documents] = draftWithFiles($student->id);

    $this->getJson("/api/v1/student/applications/{$application->id}/documents/{$documents[0]->id}/view")
        ->assertOk()
        ->assertJsonStructure(['url', 'expires_at', 'file_name', 'mime'])
        ->assertJsonPath('file_name', 'letter-1.pdf');

    expect(DocumentAccessLog::where('document_id', $documents[0]->id)->where('action', 'view')->exists())->toBeTrue();
});

it('lets the applicant remove one of several files without touching the others', function () {
    $student = actingAsStudentPortal();
    [$application, , $documents] = draftWithFiles($student->id);

    $this->deleteJson("/api/v1/student/applications/{$application->id}/documents/{$documents[0]->id}")->assertOk();

    expect(Document::count())->toBe(1)->and(Document::sole()->id)->toBe($documents[1]->id);
});

it('keeps other applicants out and refuses files from a different application', function () {
    $student = actingAsStudentPortal();
    [$other] = draftWithFiles(Student::factory()->create()->id);
    [$mine, , $mineDocs] = draftWithFiles($student->id, 1);
    [, , $otherDocs] = draftWithFiles(Student::factory()->create()->id, 1);

    $this->getJson("/api/v1/student/applications/{$other->id}/documents")->assertNotFound();
    $this->getJson("/api/v1/student/applications/{$mine->id}/documents/{$otherDocs[0]->id}/view")->assertNotFound();
    $this->deleteJson("/api/v1/student/applications/{$mine->id}/documents/{$otherDocs[0]->id}")->assertNotFound();
    expect(Document::count())->toBe(4);
});

it('does the same for a partner applying on behalf of their own student', function () {
    Storage::fake('s3');
    $agent = actingAsAgent();
    $student = Student::factory()->create(['agent_id' => $agent->id]);
    [$application, , $documents] = draftWithFiles($student->id, 2);
    $application->forceFill(['agent_id' => $agent->id])->save();

    $this->getJson("/api/v1/agent/applications/{$application->id}/documents")->assertOk()->assertJsonCount(2, 'data');
    $this->getJson("/api/v1/agent/applications/{$application->id}/documents/{$documents[1]->id}/view")->assertOk()->assertJsonStructure(['url']);
    $this->deleteJson("/api/v1/agent/applications/{$application->id}/documents/{$documents[1]->id}")->assertOk();
    expect(Document::count())->toBe(1);
});

it('does not let an applicant change a draft that was already submitted', function () {
    $student = actingAsStudentPortal();
    [$application, , $documents] = draftWithFiles($student->id, 1);
    $application->forceFill(['status' => 'under_review'])->save();

    $this->deleteJson("/api/v1/student/applications/{$application->id}/documents/{$documents[0]->id}")->assertStatus(409);
});

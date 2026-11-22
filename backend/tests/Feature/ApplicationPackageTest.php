<?php

use App\Models\Application;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\DocumentAccessLog;
use App\Models\DocumentType;
use App\Models\Program;
use App\Models\Student;
use App\Models\StudentGuardian;
use App\Models\University;
use App\Services\Documents\ApplicationPackage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

const PACKAGE_ADMIN = ['applications.view.global', 'students.view.global', 'documents.view.global'];

beforeEach(function () {
    config(['filesystems.documents_disk' => 'local']);
    Storage::fake('local');
});

/** @return array{application: Application, student: Student} */
function packagedApplication(): array
{
    $student = Student::factory()->create(['first_name' => 'Ayesha', 'last_name' => 'Khan', 'email' => 'ayesha@example.test', 'passport_no' => 'AB1234567', 'phone' => '+92 300 0000000']);
    StudentGuardian::create(['student_id' => $student->id, 'name' => 'Imran Khan', 'relation' => 'Father']);
    $university = University::factory()->create(['name' => 'Henan Medical University']);
    $program = Program::factory()->create(['university_id' => $university->id, 'name' => 'Clinical Medicine (MBBS)']);
    $application = Application::factory()->create(['student_id' => $student->id, 'university_id' => $university->id, 'program_id' => $program->id]);

    return ['application' => $application, 'student' => $student];
}

function storedDocument(Application|Student $owner, string $typeName, string $fileName, string $contents, bool $sensitive = false): Document
{
    $type = DocumentType::query()->where('name', $typeName)->first() ?? DocumentType::factory()->create(['name' => $typeName, 'is_sensitive' => $sensitive]);
    $path = 'docs/'.uniqid().'-'.$fileName;
    Storage::disk('local')->put($path, $contents);

    return $owner->documents()->create(['document_type_id' => $type->id, 'file_path' => $path, 'file_name' => $fileName, 'mime' => 'application/pdf', 'size' => strlen($contents), 'status' => 'verified', 'version' => 1]);
}

function zipEntries(string $binary): array
{
    $tmp = tempnam(sys_get_temp_dir(), 'tz');
    file_put_contents($tmp, $binary);
    $zip = new ZipArchive;
    $zip->open($tmp);
    $entries = [];
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $entries[$zip->getNameIndex($i)] = $zip->getFromIndex($i);
    }
    $zip->close();
    unlink($tmp);

    return $entries;
}

it('downloads one ZIP named student-program-university with the personal information and every document', function () {
    $admin = actingAsStaffWith(PACKAGE_ADMIN);
    ['application' => $application, 'student' => $student] = packagedApplication();
    storedDocument($application, 'Transcript', 'transcript.pdf', 'TRANSCRIPT-BYTES');
    storedDocument($application, 'Transcript', 'transcript.pdf', 'SECOND-BYTES');
    storedDocument($student, 'Passport', 'passport scan.pdf', 'PASSPORT-BYTES', sensitive: true);

    $response = $this->get('/api/v1/applications/'.$application->id.'/package')->assertOk();

    expect($response->headers->get('content-type'))->toBe('application/zip')
        ->and($response->headers->get('content-disposition'))->toContain('Ayesha Khan-Clinical Medicine (MBBS)-Henan Medical University.zip')
        ->and($response->headers->get('x-package-documents'))->toBe('3');

    $entries = zipEntries($response->streamedContent());
    expect(array_keys($entries))->toContain('Personal information.txt')
        ->toContain('Application documents/Transcript - transcript.pdf')
        ->toContain('Application documents/Transcript - transcript (2).pdf')
        ->toContain('Student documents/Passport - passport scan.pdf')
        ->and($entries['Application documents/Transcript - transcript.pdf'])->toBe('TRANSCRIPT-BYTES')
        ->and($entries['Student documents/Passport - passport scan.pdf'])->toBe('PASSPORT-BYTES');

    $sheet = $entries['Personal information.txt'];
    expect($sheet)->toContain('Ayesha')->toContain('Khan')->toContain('AB1234567')->toContain('ayesha@example.test')
        ->toContain('Imran Khan (Father)')->toContain('Henan Medical University')->toContain('Clinical Medicine (MBBS)');

    // Every file that went in is in the access log, and the package itself in the audit log.
    expect(DocumentAccessLog::where('user_id', $admin->id)->where('action', 'download')->count())->toBe(3)
        ->and(AuditLog::where('action', 'download')->where('auditable_id', $application->id)->first()->new_values['documents'])->toBe(3);
});

it('leaves out documents the account may not see and says so in the sheet', function () {
    actingAsStaffWith(['applications.view.global', 'students.view.global', 'documents.view.branch']);
    ['application' => $application, 'student' => $student] = packagedApplication();
    storedDocument($application, 'Offer letter', 'letter.pdf', 'LETTER');
    // Sensitive types are never shown through branch visibility.
    storedDocument($student, 'Passport', 'passport.pdf', 'SECRET', sensitive: true);

    $response = $this->get('/api/v1/applications/'.$application->id.'/package')->assertOk();
    $entries = zipEntries($response->streamedContent());

    expect(array_keys($entries))->not->toContain('Student documents/Passport - passport.pdf')
        ->and(json_encode($entries))->not->toContain('SECRET')
        ->and($entries['Personal information.txt'])->toContain('1 more document is not included')
        ->and($response->headers->get('x-package-skipped'))->toBe('1');
});

it('names a missing file in the sheet instead of failing', function () {
    actingAsStaffWith(PACKAGE_ADMIN);
    ['application' => $application] = packagedApplication();
    $doc = storedDocument($application, 'Certificate', 'cert.pdf', 'X');
    Storage::disk('local')->delete($doc->file_path);

    $entries = zipEntries($this->get('/api/v1/applications/'.$application->id.'/package')->assertOk()->streamedContent());

    expect(array_keys($entries))->toBe(['Personal information.txt'])
        ->and($entries['Personal information.txt'])->toContain('could not be found in storage: cert.pdf');
});

it('refuses accounts that cannot see the application or its documents', function () {
    ['application' => $application] = packagedApplication();

    // No documents permission at all.
    actingAsStaffWith(['applications.view.global', 'students.view.global']);
    $this->get('/api/v1/applications/'.$application->id.'/package')->assertForbidden();

    // An application outside the account's own scope.
    actingAsStaffWith(['applications.view.assigned', 'documents.view.assigned']);
    $this->get('/api/v1/applications/'.$application->id.'/package')->assertForbidden();
});

it('requires a sign-in', function () {
    ['application' => $application] = packagedApplication();

    $this->getJson('/api/v1/applications/'.$application->id.'/package')->assertUnauthorized();
});

it('keeps characters that are not allowed in file names out of the ZIP name', function () {
    actingAsStaffWith(PACKAGE_ADMIN);
    $student = Student::factory()->create(['first_name' => 'Li/Wei', 'last_name' => 'Zhang: "Jr"']);
    $university = University::factory()->create(['name' => 'Univ*ersity?']);
    $program = Program::factory()->create(['university_id' => $university->id, 'name' => 'Medicine <MBBS> | 6 years']);
    $application = Application::factory()->create(['student_id' => $student->id, 'university_id' => $university->id, 'program_id' => $program->id]);

    $name = app(ApplicationPackage::class)->fileName($application);

    expect($name)->toBe('Li Wei Zhang Jr-Medicine MBBS 6 years-Univ ersity.zip')
        ->and($name)->not->toMatch('/[\\\\\/:*?"<>|]/');
});

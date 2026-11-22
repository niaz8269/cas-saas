<?php

namespace App\Services\Documents;

use App\Models\Application;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

/**
 * One ZIP with everything CAS holds on an application: a readable sheet with the student's personal information,
 * the application and the list of documents, plus the submitted files themselves. Only the files the person
 * downloading is allowed to see are included (the same policy as downloading them one by one), every file that
 * goes in is written to the document access log, and the download is recorded in the audit log.
 */
class ApplicationPackage
{
    private const MAX_NAME_PART = 60;

    public function __construct(private readonly DocumentService $documents) {}

    /** "Student name-Program-University.zip", safe on Windows, macOS and Linux. */
    public function fileName(Application $application): string
    {
        $application->loadMissing(['student', 'program', 'scholarship', 'university']);
        $student = $application->student;

        $parts = [
            trim(($student?->first_name ?? '').' '.($student?->last_name ?? '')),
            $application->program?->name ?? $application->scholarship?->name ?? ($application->level ? ucfirst((string) $application->level).' application' : 'Application'),
            $application->university?->name ?? 'University',
        ];

        $parts = array_map(fn (string $p) => $this->safe($p, self::MAX_NAME_PART) ?: 'Unknown', $parts);

        return implode('-', $parts).'.zip';
    }

    /**
     * Builds the ZIP in a temporary file.
     *
     * @return array{path: string, name: string, included: int, skipped: int}
     */
    public function build(Application $application, User $user, ?string $ip): array
    {
        $application->load([
            'student.country', 'student.agent', 'student.counselor', 'student.guardians', 'student.education',
            'university', 'program', 'intake', 'scholarship', 'agent', 'admissionsOfficer',
            'documents.type', 'student.documents.type',
        ]);

        $zipPath = tempnam(sys_get_temp_dir(), 'pkg');
        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Could not create the ZIP file.');
        }

        $temps = [];
        $included = [];
        $notAllowed = 0;
        $missing = [];
        $used = [];

        $groups = [
            'Application documents' => $application->documents,
            'Student documents' => $application->student?->documents ?? collect(),
        ];

        foreach ($groups as $folder => $documents) {
            foreach ($documents as $document) {
                if (! Gate::forUser($user)->allows('view', $document)) {
                    $notAllowed++;

                    continue;
                }

                $stream = $this->open($document);
                if ($stream === null) {
                    $missing[] = $document->file_name;

                    continue;
                }

                $temp = tempnam(sys_get_temp_dir(), 'doc');
                $out = fopen($temp, 'wb');
                stream_copy_to_stream($stream, $out);
                fclose($out);
                fclose($stream);
                $temps[] = $temp;

                $entry = $this->entryName($folder, $document, $used);
                $zip->addFile($temp, $entry);
                $included[] = ['document' => $document, 'entry' => $entry, 'folder' => $folder];
            }
        }

        $zip->addFromString('Personal information.txt', "\xEF\xBB\xBF".$this->sheet($application, $included, $notAllowed, $missing));
        $zip->close();

        foreach ($temps as $temp) {
            @unlink($temp);
        }

        foreach ($included as $row) {
            $this->documents->log($row['document'], $user->id, 'download', $ip);
        }
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'download',
            'auditable_type' => Application::class,
            'auditable_id' => $application->id,
            'new_values' => ['package' => true, 'documents' => count($included), 'not_permitted' => $notAllowed, 'missing' => count($missing)],
            'ip' => $ip,
            'user_agent' => Str::limit((string) request()->userAgent(), 250, ''),
            'created_at' => now(),
        ]);

        return ['path' => $zipPath, 'name' => $this->fileName($application), 'included' => count($included), 'skipped' => $notAllowed + count($missing)];
    }

    /** @return resource|null */
    private function open(Document $document)
    {
        $disk = Storage::disk(DocumentService::internalDisk());
        if (! $document->file_path || ! $disk->exists($document->file_path)) {
            return null;
        }

        return $disk->readStream($document->file_path) ?: null;
    }

    /**
     * "Application documents/Passport - scan.pdf"; a second file with the same name becomes "(2)".
     *
     * @param  array<string, true>  $used
     */
    private function entryName(string $folder, Document $document, array &$used): string
    {
        $original = (string) $document->file_name;
        $extension = strtolower(pathinfo($original, PATHINFO_EXTENSION));
        $base = pathinfo($original, PATHINFO_FILENAME);
        $type = $document->type?->name;
        $label = $this->safe(trim(($type ? $type.' - ' : '').$base), 120) ?: 'Document';
        $suffix = $extension !== '' ? '.'.preg_replace('/[^a-z0-9]/', '', $extension) : '';

        $name = $folder.'/'.$label.$suffix;
        for ($i = 2; isset($used[strtolower($name)]); $i++) {
            $name = $folder.'/'.$label.' ('.$i.')'.$suffix;
        }
        $used[strtolower($name)] = true;

        return $name;
    }

    /**
     * The readable sheet at the top of the ZIP.
     *
     * @param  list<array{document: Document, entry: string, folder: string}>  $included
     * @param  list<string>  $missing
     */
    private function sheet(Application $application, array $included, int $notAllowed, array $missing): string
    {
        $s = $application->student;
        $date = fn ($d) => $d ? $d->format('Y-m-d') : '-';
        $v = fn ($value) => filled($value) ? (string) $value : '-';
        $lines = [];
        $section = function (string $title) use (&$lines): void {
            $lines[] = '';
            $lines[] = strtoupper($title);
            $lines[] = str_repeat('-', strlen($title));
        };
        $row = function (string $label, $value) use (&$lines, $v): void {
            $lines[] = str_pad($label.':', 28).$v($value);
        };

        $lines[] = 'APPLICATION PACKAGE';
        $lines[] = 'Prepared '.now()->format('Y-m-d H:i').' (server time). Confidential: contains personal data. Share only with people who need it.';

        $section('Application');
        $row('Application code', $application->application_code);
        $row('Type', $application->kind);
        $row('University', $application->university?->name);
        $row('Program', $application->program?->name);
        $row('Level', $application->level);
        $row('Intake', $application->intake?->name);
        $row('Scholarship', $application->scholarship?->name);
        $row('Status', $application->status);
        $row('Submitted on', $date($application->submitted_at));
        $row('Submitted by', $application->submitted_via);
        $row('Partner agency', $application->agent?->name);
        $row('Admissions officer', $application->admissionsOfficer?->name);
        foreach ((array) ($application->custom_fields ?? []) as $key => $value) {
            $row(Str::headline((string) $key), is_scalar($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE));
        }

        $section('Student');
        $row('Student code', $s?->student_code);
        $row('First name', $s?->first_name);
        $row('Last name', $s?->last_name);
        $row('Chinese name', $s?->chinese_name);
        $row('Date of birth', $date($s?->dob));
        $row('Place of birth', $s?->place_of_birth);
        $row('Gender', $s?->gender);
        $row('Marital status', $s?->marital_status);
        $row('Religion', $s?->religion);
        $row('Nationality / country', $s?->country?->name);
        $row('Native language', $s?->native_language);

        $section('Passport');
        $row('Passport number', $s?->passport_no);
        $row('Issue date', $date($s?->passport_issue_date));
        $row('Expiry date', $date($s?->passport_expiry_date));

        $section('Contact');
        $row('Email', $s?->email);
        $row('Alternate email', $s?->alternate_email);
        $row('Phone', $s?->phone);
        $row('WeChat', $s?->wechat_id);
        $row('Skype', $s?->skype_id);
        $row('Current address', $s?->current_address);
        $row('Permanent address', $s?->permanent_address);
        $row('City', $s?->city);
        $row('Postal code', $s?->postal_code);

        $section('English test');
        $row('Test', $s?->english_test);
        $row('Score', $s?->english_test_score);
        $row('Date', $date($s?->english_test_date));

        $section('Education');
        if (($s?->education ?? collect())->isEmpty()) {
            $lines[] = 'None recorded.';
        }
        foreach ($s?->education ?? [] as $i => $e) {
            $lines[] = '';
            $lines[] = ($i + 1).'. '.$v($e->degree_name ?: $e->level);
            $row('   Institution', $e->institution);
            $row('   Board / university', $e->board_or_university);
            $row('   Major', $e->major);
            $row('   Years', trim(($e->start_year ?? '').' - '.($e->end_year ?? ''), ' -'));
            $row('   Grade', trim(($e->grade_value ?? '').' '.($e->grade_type ?? '')));
            $row('   Completed', $e->is_completed ? 'yes' : 'no');
        }

        $section('Family / guardians');
        if (($s?->guardians ?? collect())->isEmpty()) {
            $lines[] = 'None recorded.';
        }
        foreach ($s?->guardians ?? [] as $i => $g) {
            $lines[] = '';
            $lines[] = ($i + 1).'. '.$v($g->name).' ('.$v($g->relation).')';
            $row('   Occupation', $g->occupation);
            $row('   Phone', $g->phone);
            $row('   Email', $g->email);
            $row('   Address', $g->address);
        }

        $section('Documents in this package');
        if ($included === []) {
            $lines[] = 'No documents.';
        }
        foreach ($included as $item) {
            $d = $item['document'];
            $lines[] = '- '.$item['entry'].'  ['.$v($d->type?->name).', status: '.$v($d->status).', version '.$v($d->version).']';
        }
        if ($notAllowed > 0) {
            $lines[] = '';
            $lines[] = $notAllowed.' more document'.($notAllowed === 1 ? ' is' : 's are').' not included because your account may not view '.($notAllowed === 1 ? 'it' : 'them').'.';
        }
        if ($missing !== []) {
            $lines[] = '';
            $lines[] = 'Not included because the file could not be found in storage: '.implode(', ', $missing).'.';
        }

        return implode("\r\n", $lines)."\r\n";
    }

    /** Removes what Windows, macOS and Linux do not allow in a file name, and shortens it. */
    private function safe(string $text, int $max): string
    {
        $text = preg_replace('/[\\\\\/:*?"<>|\x00-\x1F]+/u', ' ', $text) ?? '';
        $text = trim(preg_replace('/\s+/u', ' ', $text) ?? '', " .\t");

        return rtrim(mb_substr($text, 0, $max), ' .');
    }
}

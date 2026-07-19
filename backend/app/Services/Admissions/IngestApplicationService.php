<?php

namespace App\Services\Admissions;

use App\Models\ApiSource;
use App\Models\Application;
use App\Models\Country;
use App\Models\DocumentType;
use App\Models\Program;
use App\Models\Student;
use App\Models\User;
use App\Services\Comms\NotificationService;
use App\Services\Documents\DocumentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Ingests a full direct-admission application from a partner site (e.g. the
 * Xinjiang Medical MBBS site). De-dupes/creates the student, creates a program
 * application tagged with the source and flagged for verification, stores the
 * base64 documents, and routes it to Admissions.
 */
class IngestApplicationService
{
    public function __construct(
        private readonly ApplicationWorkflow $workflow,
        private readonly DocumentService $documents,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     * @return array{status: int, body: array<string, mixed>}
     */
    public function ingest(ApiSource $source, array $data): array
    {
        $programId = $data['program_id'] ?? $source->default_program_id;
        $program = $programId ? Program::find($programId) : null;

        if ($program === null) {
            throw new UnprocessableEntityHttpException('No program: set the source default program or pass program_id.');
        }

        return DB::transaction(function () use ($source, $data, $program) {
            $student = $this->resolveStudent($data['student'], $data);

            $application = $this->workflow->create([
                'kind' => 'program',
                'student_id' => $student->id,
                'university_id' => $program->university_id,
                'program_id' => $program->id,
                'source_id' => $source->id,
                'review' => true,
                'agent_id' => $student->agent_id,
            ], null);

            foreach ($data['documents'] ?? [] as $doc) {
                $this->storeDocument($application, $doc);
            }

            $officer = $this->pickAdmissionsOfficer();

            if ($officer !== null) {
                $application->forceFill(['assigned_admissions_id' => $officer->id])->save();
            }

            $this->workflow->transition($application, 'under_review', null, $this->reviewNote($source, $data));

            if ($officer !== null) {
                $this->notifications->push(
                    $officer->id,
                    'application.ingested',
                    'New web application to verify',
                    "{$application->application_code} arrived from {$source->name} and needs verification.",
                    entityType: 'application',
                    entityId: $application->id,
                );
            }

            return [
                'status' => 201,
                'body' => [
                    'application_id' => $application->id,
                    'application_code' => $application->application_code,
                    'student_code' => $student->student_code,
                    'status' => $application->fresh()->status,
                ],
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $s  student payload
     * @param  array<string, mixed>  $data  full payload (guardians/education)
     */
    private function resolveStudent(array $s, array $data): Student
    {
        $attributes = [
            'first_name' => $s['first_name'],
            'last_name' => $s['last_name'] ?? '',
            'chinese_name' => $s['chinese_name'] ?? null,
            'email' => $s['email'] ?? null,
            'alternate_email' => $s['alternate_email'] ?? null,
            'phone' => $s['phone'] ?? null,
            'wechat_id' => $s['wechat_id'] ?? null,
            'skype_id' => $s['skype_id'] ?? null,
            'native_language' => $s['native_language'] ?? null,
            'passport_no' => $s['passport_no'] ?? null,
            'passport_expiry_date' => $s['passport_expiry_date'] ?? null,
            'dob' => $s['dob'] ?? null,
            'gender' => $s['gender'] ?? null,
            'marital_status' => $s['marital_status'] ?? null,
            'religion' => $s['religion'] ?? null,
            'place_of_birth' => $s['place_of_birth'] ?? null,
            'city' => $s['city'] ?? null,
            'current_address' => $s['current_address'] ?? null,
            'permanent_address' => $s['permanent_address'] ?? null,
            'country_id' => $this->resolveCountry($s['nationality'] ?? null),
        ];

        $student = Student::query()
            ->when(! empty($s['email']), fn ($q) => $q->orWhere('email', $s['email']))
            ->when(! empty($s['passport_no']), fn ($q) => $q->orWhere('passport_no', $s['passport_no']))
            ->first();

        if ($student) {
            $student->fill(array_filter($attributes, fn ($v) => $v !== null))->save();
        } else {
            $student = Student::create([
                ...$attributes,
                'student_code' => $this->nextStudentCode(),
                'status' => 'active',
            ]);
        }

        $guardians = $this->collectGuardians($data);
        if ($guardians !== []) {
            $student->guardians()->delete();
            foreach ($guardians as $guardian) {
                $student->guardians()->create($guardian);
            }
        }

        if (array_key_exists('education', $data)) {
            $student->education()->delete();
            foreach ($data['education'] as $entry) {
                $student->education()->create($entry);
            }
        }

        return $student;
    }

    /**
     * Merge explicit guardians with the emergency contact (recorded as a
     * guardian so it surfaces on the student profile).
     *
     * @param  array<string, mixed>  $data
     * @return array<int, array<string, mixed>>
     */
    private function collectGuardians(array $data): array
    {
        $guardians = array_values($data['guardians'] ?? []);

        $emergency = $data['emergency_contact'] ?? null;
        if (is_array($emergency) && ! empty($emergency['name'])) {
            $guardians[] = [
                'name' => $emergency['name'],
                'relation' => $emergency['relation'] ?? 'Emergency contact',
                'phone' => $emergency['phone'] ?? null,
                'email' => $emergency['email'] ?? null,
                'address' => $emergency['address'] ?? null,
            ];
        }

        return $guardians;
    }

    /** A short note for the review queue capturing what the applicant declared. */
    private function reviewNote(ApiSource $source, array $data): string
    {
        $declared = array_filter([
            $data['declared_degree'] ?? null,
            $data['declared_major'] ?? null,
        ], fn ($v) => filled($v));

        $suffix = $declared !== [] ? ' (applied for '.implode(' — ', $declared).')' : '';

        return "Ingested from {$source->name} — verify.{$suffix}";
    }

    /**
     * @param  array<string, mixed>  $doc
     */
    private function storeDocument(Application $application, array $doc): void
    {
        $content = base64_decode($doc['content'], true);

        if ($content === false) {
            return; // skip an unreadable document rather than failing the whole request
        }

        $type = DocumentType::firstOrCreate(['name' => $doc['type']], ['category' => 'application']);

        $ext = strtolower(pathinfo($doc['file_name'], PATHINFO_EXTENSION)) ?: 'bin';
        $key = $this->documents->keyPrefix($application)
            .Str::uuid().'_'.Str::limit(Str::slug(pathinfo($doc['file_name'], PATHINFO_FILENAME)), 80, '').'.'.$ext;

        Storage::disk(DocumentService::DISK)->put($key, $content);

        $this->documents->register(
            $application,
            $type,
            $key,
            $doc['file_name'],
            $doc['mime'] ?? 'application/octet-stream',
            strlen($content),
            null,
            null,
        );
    }

    /** Resolve a nationality given either a country name ("Pakistan") or an ISO-2 code. */
    private function resolveCountry(?string $nationality): ?int
    {
        $nationality = trim((string) $nationality);
        if ($nationality === '') {
            return null;
        }

        if (strlen($nationality) === 2) {
            $id = Country::where('iso2', strtoupper($nationality))->value('id');
            if ($id !== null) {
                return $id;
            }
        }

        return Country::whereRaw('LOWER(name) = ?', [strtolower($nationality)])->value('id');
    }

    /** Least-loaded Admissions officer (mirrors the portal submit routing). */
    private function pickAdmissionsOfficer(): ?User
    {
        $officerIds = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'Admissions'))
            ->orderBy('id')
            ->pluck('id');

        if ($officerIds->isEmpty()) {
            return null;
        }

        $load = Application::query()
            ->whereIn('assigned_admissions_id', $officerIds->all())
            ->whereNotIn('status', ['accepted', 'rejected', 'withdrawn'])
            ->selectRaw('assigned_admissions_id, COUNT(*) as open_count')
            ->groupBy('assigned_admissions_id')
            ->pluck('open_count', 'assigned_admissions_id');

        return User::find($officerIds->sortBy(fn ($id) => $load[$id] ?? 0)->first());
    }

    private function nextStudentCode(): string
    {
        $year = now()->year;
        $sequence = Student::withTrashed()->count() + 1;

        do {
            $code = sprintf('STU-%d-%05d', $year, $sequence);
            $sequence++;
        } while (Student::withTrashed()->where('student_code', $code)->exists());

        return $code;
    }
}

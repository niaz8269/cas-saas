<?php

namespace App\Services\Documents;

use App\Models\Application;
use App\Models\Document;
use App\Models\DocumentAccessLog;
use App\Models\DocumentType;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Documents live in S3/MinIO under keyed paths and are never public:
 * uploads and downloads go through short-lived pre-signed URLs brokered
 * here after a policy check, and every access is logged (§4.7).
 */
class DocumentService
{
    public const DISK = 's3';

    /**
     * Same bucket as DISK, but over the server-to-server network path. Use for
     * reading/writing bytes on the server; use DISK for browser presigned URLs.
     */
    public const INTERNAL_DISK = 's3_internal';

    public const MAX_BYTES = 25 * 1024 * 1024;

    public const ALLOWED_MIMES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    /** Short type names accepted by the API mapped to models. */
    public const DOCUMENTABLES = [
        'application' => Application::class,
        'student' => Student::class,
    ];

    /**
     * Keyed storage path for a documentable (always under the student).
     */
    public function keyPrefix(Application|Student $documentable): string
    {
        return $documentable instanceof Application
            ? "students/{$documentable->student_id}/applications/{$documentable->id}/"
            : "students/{$documentable->id}/";
    }

    /**
     * @return array{key: string, url: string, headers: array<string, string>, expires_at: string}
     */
    public function presignUpload(Application|Student $documentable, string $fileName, string $mime): array
    {
        $safeName = Str::limit(Str::slug(pathinfo($fileName, PATHINFO_FILENAME)), 80, '')
            .'.'.strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        $key = $this->keyPrefix($documentable).Str::uuid().'_'.$safeName;
        $expiresAt = now()->addMinutes(15);

        ['url' => $url, 'headers' => $headers] = Storage::disk(self::DISK)
            ->temporaryUploadUrl($key, $expiresAt, ['ContentType' => $mime]);

        return [
            'key' => $key,
            'url' => $url,
            'headers' => [...$headers, 'Content-Type' => $mime],
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    /**
     * Register an uploaded object as a Document (next version per type).
     * $actorId is the staff user id, or null for a portal upload (the
     * documentable already records ownership; audit columns stay
     * staff-only, matching the verified_by FK intent).
     */
    public function register(
        Application|Student $documentable,
        DocumentType $type,
        string $key,
        string $fileName,
        string $mime,
        int $size,
        ?int $actorId,
        ?string $ip,
    ): Document {
        return DB::transaction(function () use ($documentable, $type, $key, $fileName, $mime, $size, $actorId, $ip) {
            $version = (int) $documentable->documents()
                ->where('document_type_id', $type->id)
                ->max('version') + 1;

            $document = $documentable->documents()->create([
                'document_type_id' => $type->id,
                'file_path' => $key,
                'file_name' => $fileName,
                'mime' => $mime,
                'size' => $size,
                'status' => 'pending',
                'version' => $version,
                'created_by' => $actorId,
            ]);

            $this->log($document, $actorId, 'upload', $ip);

            return $document;
        });
    }

    /**
     * @return array{url: string, expires_at: string}
     */
    public function downloadUrl(Document $document, ?int $actorId, ?string $ip): array
    {
        $expiresAt = now()->addMinutes(10);

        $url = Storage::disk(self::DISK)->temporaryUrl($document->file_path, $expiresAt);

        $this->log($document, $actorId, 'download', $ip);

        return ['url' => $url, 'expires_at' => $expiresAt->toIso8601String()];
    }

    public function log(Document $document, ?int $actorId, string $action, ?string $ip): void
    {
        DocumentAccessLog::create([
            'document_id' => $document->id,
            'user_id' => $actorId,
            'action' => $action,
            'ip' => $ip,
            'created_at' => now(),
        ]);
    }
}

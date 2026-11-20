<?php

namespace App\Services\Content;

use App\Models\AuditLog;
use App\Models\ExclusiveMaterial;
use App\Services\Documents\DocumentService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Stores and serves agency marketing files on the private documents disk; every download is logged. */
class ExclusiveMaterialStorage
{
    /** @param array<string, mixed> $data */
    public function store(UploadedFile $file, array $data, ?int $offerId, ?int $userId): ExclusiveMaterial
    {
        $disk = DocumentService::disk();
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin');
        $path = Storage::disk($disk)->putFileAs('exclusives/'.($offerId ?? 'library'), $file, Str::uuid().'.'.$extension);

        return ExclusiveMaterial::create([
            'exclusive_offer_id' => $offerId,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'disk' => $disk,
            'path' => $path,
            'original_name' => Str::limit($file->getClientOriginalName(), 240, ''),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'uploaded_by' => $userId,
        ]);
    }

    public function delete(ExclusiveMaterial $material): void
    {
        Storage::disk($material->disk)->delete($material->path);
        $material->delete();
    }

    /** @param array{user_id?: int|null, agent_id?: int|null} $actor */
    public function download(ExclusiveMaterial $material, Request $request, array $actor): StreamedResponse
    {
        abort_unless(Storage::disk($material->disk)->exists($material->path), 404);

        $material->increment('download_count');
        AuditLog::create([
            'user_id' => $actor['user_id'] ?? null,
            'action' => 'download',
            'auditable_type' => ExclusiveMaterial::class,
            'auditable_id' => $material->id,
            'new_values' => array_filter(['agent_id' => $actor['agent_id'] ?? null, 'title' => $material->title]),
            'ip' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 250, ''),
            'created_at' => now(),
        ]);

        return Storage::disk($material->disk)->download($material->path, $material->original_name);
    }
}

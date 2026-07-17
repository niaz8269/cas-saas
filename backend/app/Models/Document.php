<?php

namespace App\Models;

use Database\Factories\DocumentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Polymorphic document stored in S3/MinIO under keyed paths; never
 * public — access only via short-lived pre-signed URLs, always logged.
 * Status: pending → verified | rejected.
 */
class Document extends Model
{
    /** @use HasFactory<DocumentFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'document_type_id',
        'documentable_type',
        'documentable_id',
        'file_path',
        'file_name',
        'mime',
        'size',
        'status',
        'version',
        'verified_by',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'version' => 'integer',
        ];
    }

    public function documentable(): MorphTo
    {
        return $this->morphTo();
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class, 'document_type_id');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function accessLogs(): HasMany
    {
        return $this->hasMany(DocumentAccessLog::class);
    }
}

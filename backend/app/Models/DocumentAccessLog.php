<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Compliance trail for sensitive document access. Append-only.
 */
class DocumentAccessLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'document_id',
        'user_id',
        'action',
        'ip',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ErrorLog extends Model
{
    protected $fillable = [
        'fingerprint',
        'level',
        'type',
        'message',
        'file',
        'line',
        'url',
        'method',
        'status',
        'user_type',
        'user_id',
        'ip',
        'user_agent',
        'context',
        'occurrences',
        'first_seen_at',
        'last_seen_at',
        'resolved_at',
        'resolved_by',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
            'occurrences' => 'integer',
            'line' => 'integer',
            'status' => 'integer',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function scopeUnresolved($query)
    {
        return $query->whereNull('resolved_at');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiKey extends Model
{
    protected $fillable = [
        'api_source_id',
        'key_hash',
        'scopes',
        'rate_limit',
        'revoked_at',
    ];

    protected $hidden = [
        'key_hash',
    ];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'rate_limit' => 'integer',
            'revoked_at' => 'datetime',
        ];
    }

    public function apiSource(): BelongsTo
    {
        return $this->belongsTo(ApiSource::class);
    }
}

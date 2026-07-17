<?php

namespace App\Models;

use Database\Factories\WebsiteSourceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebsiteSource extends Model
{
    /** @use HasFactory<WebsiteSourceFactory> */
    use HasFactory;

    protected $fillable = [
        'api_source_id',
        'domain',
        'university_focus',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function apiSource(): BelongsTo
    {
        return $this->belongsTo(ApiSource::class);
    }
}

<?php

namespace App\Models;

use Database\Factories\MarketingSourceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MarketingSource extends Model
{
    /** @use HasFactory<MarketingSourceFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'channel',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }
}

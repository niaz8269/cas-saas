<?php

namespace App\Models;

use Database\Factories\VisaChecklistItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisaChecklistItem extends Model
{
    /** @use HasFactory<VisaChecklistItemFactory> */
    use HasFactory;

    protected $fillable = [
        'visa_case_id',
        'name',
        'is_required',
        'document_id',
        'status', // pending|received|verified
    ];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
        ];
    }

    public function visaCase(): BelongsTo
    {
        return $this->belongsTo(VisaCase::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}

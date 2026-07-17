<?php

namespace App\Models;

use Database\Factories\DocumentTypeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentType extends Model
{
    /** @use HasFactory<DocumentTypeFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'category',
        'is_sensitive',
        'required_for',
    ];

    protected function casts(): array
    {
        return [
            'is_sensitive' => 'boolean',
            'required_for' => 'array',
        ];
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /** Types whose checklist gates a context (e.g. 'application'). */
    public function scopeRequiredFor($query, string $context)
    {
        return $query->whereJsonContains('required_for', $context);
    }
}

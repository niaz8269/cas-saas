<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * An exclusive program or university that CAS offers only through agencies: commission by agency level, fee
 * structure, nationality limits and conditions. Visible to approved agencies, counselors and admins, never to
 * the public.
 */
class ExclusiveOffer extends Model
{
    use Auditable, SoftDeletes;

    public const TYPES = ['university', 'program', 'other'];

    /** partners: approved agencies and the CAS team. private: the CAS team only. */
    public const AUDIENCES = ['partners', 'private'];

    /** Agency levels, matching agents.type. */
    public const LEVELS = ['partner', 'sub', 'sub_sub'];

    protected $fillable = [
        'title', 'slug', 'offer_type', 'audience', 'university_id', 'program_id', 'summary',
        'commission_rates', 'commission_notes', 'fee_structure', 'fee_notes',
        'eligible_nationalities', 'restricted_nationalities', 'nationality_notes',
        'conditions', 'status', 'published_at', 'sort_order', 'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'commission_rates' => 'array',
            'fee_structure' => 'array',
            'eligible_nationalities' => 'array',
            'restricted_nationalities' => 'array',
            'published_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function materials(): HasMany
    {
        return $this->hasMany(ExclusiveMaterial::class)->orderBy('title');
    }

    /** A unique slug from the title. */
    public static function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'exclusive';
        $slug = $base;
        $i = 2;
        while (static::withTrashed()->where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    /** The commission an agency of this level earns, or null when none is set for the level. */
    public function rateFor(string $level): ?array
    {
        $rate = ($this->commission_rates ?? [])[$level] ?? null;

        return is_array($rate) && isset($rate['value']) && $rate['value'] !== '' ? $rate : null;
    }
}

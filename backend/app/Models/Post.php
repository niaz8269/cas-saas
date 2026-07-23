<?php

namespace App\Models;

use Database\Factories\PostFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * A content item — news article, blog post, or event (report content system).
 * One table, discriminated by `type`; event rows use the event_* columns.
 * `body` holds server-sanitized HTML.
 */
class Post extends Model
{
    /** @use HasFactory<PostFactory> */
    use HasFactory;

    use SoftDeletes;

    public const TYPES = ['news', 'blog', 'event'];

    /** Site languages a post can be translated into (base columns = default). */
    public const LOCALES = ['en', 'zh', 'ar', 'fr', 'id'];

    protected $fillable = [
        'type',
        'title',
        'slug',
        'excerpt',
        'body',
        'translations',
        'body_translations',
        'cover_image_path',
        'category',
        'status',
        'published_at',
        'author_id',
        'event_date',
        'location',
        'register_url',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'event_date' => 'datetime',
            'translations' => 'array',
            'body_translations' => 'array',
        ];
    }

    /**
     * Title/excerpt/body for a locale, falling back to the base columns when a
     * translation (or a field within it) is absent. `body` resolves from the
     * separate body_translations map, which the list query does not load.
     *
     * @return array{title: ?string, excerpt: ?string, body: ?string}
     */
    public function localized(?string $locale): array
    {
        $meta = $locale ? ($this->translations[$locale] ?? []) : [];
        $body = $locale ? ($this->body_translations[$locale] ?? null) : null;

        return [
            'title' => $meta['title'] ?? $this->title,
            'excerpt' => $meta['excerpt'] ?? $this->excerpt,
            'body' => $body ?? $this->body,
        ];
    }

    /**
     * The two translation columns recombined into one editable map
     * ({locale: {title, excerpt, body}}) for the admin editor.
     *
     * @return array<string, array<string, ?string>>
     */
    public function editorTranslations(): array
    {
        $meta = $this->translations ?? [];
        $bodies = $this->body_translations ?? [];
        $merged = [];

        foreach (array_unique([...array_keys($meta), ...array_keys($bodies)]) as $locale) {
            $merged[$locale] = [
                'title' => $meta[$locale]['title'] ?? null,
                'excerpt' => $meta[$locale]['excerpt'] ?? null,
                'body' => $bodies[$locale] ?? null,
            ];
        }

        return $merged;
    }

    protected static function booted(): void
    {
        static::creating(function (Post $post) {
            if (empty($post->slug)) {
                $post->slug = static::uniqueSlug($post->title);
            }
        });
    }

    /** A stable, unique slug derived from the title. */
    public static function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'post';
        $slug = $base;
        $i = 2;

        while (static::withTrashed()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /** Published posts whose publish time has passed (public visibility). */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }
}

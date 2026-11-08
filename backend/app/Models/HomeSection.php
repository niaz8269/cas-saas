<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;

/** One block of the public home page: its place, whether it shows, and any text/image changes. */
class HomeSection extends Model
{
    use Auditable;

    /** Built-in sections in their standard order. The hero stays first and always shows. */
    public const BUILT_IN = [
        'hero' => 10, 'cities' => 20, 'weekly' => 30, 'highlights' => 40, 'outstanding' => 50,
        'featured' => 60, 'more' => 70, 'testimonials' => 80, 'share' => 90, 'cta' => 100, 'why' => 110,
    ];

    public const CUSTOM_TYPES = ['banner', 'text'];

    protected $fillable = ['key', 'type', 'sort_order', 'is_visible', 'content', 'updated_by'];

    protected function casts(): array
    {
        return ['is_visible' => 'boolean', 'content' => 'array'];
    }

    public function isCustom(): bool
    {
        return str_starts_with($this->key, 'custom-');
    }

    public function isHero(): bool
    {
        return $this->key === 'hero';
    }
}

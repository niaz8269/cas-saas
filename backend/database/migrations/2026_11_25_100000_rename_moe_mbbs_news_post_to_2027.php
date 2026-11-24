<?php

use App\Models\Post;
use Illuminate\Database\Migrations\Migration;

/**
 * The Ministry's approved-MBBS news post is now titled for 2027. Its address changes with it; the seeders
 * (NewsSeeder, ArticleDepthSeeder) then refresh its text under the new address, and the old address answers
 * with a permanent redirect (config/seo.php renamed_posts).
 */
return new class extends Migration
{
    private const OLD = 'moe-approves-43-universities-english-mbbs-2026-27';

    private const NEW = 'moe-approves-43-universities-english-mbbs-2027';

    public function up(): void
    {
        $old = Post::withTrashed()->where('slug', self::OLD)->first();
        if ($old && ! Post::withTrashed()->where('slug', self::NEW)->exists()) {
            $old->forceFill(['slug' => self::NEW])->save();
        }
    }

    public function down(): void
    {
        $new = Post::withTrashed()->where('slug', self::NEW)->first();
        if ($new && ! Post::withTrashed()->where('slug', self::OLD)->exists()) {
            $new->forceFill(['slug' => self::OLD])->save();
        }
    }
};

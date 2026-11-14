<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * CAS describes itself as an authorized agency, not an agent. The articles already published carry the old wording
 * in their text (the seeders now use the new one); this updates them in place and does nothing once they are clean.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['body', 'excerpt'] as $column) {
            DB::table('posts')->where($column, 'like', '%authorized agent%')->orderBy('id')->each(function ($post) use ($column) {
                $fixed = preg_replace('/\b(authorized|Authorized) agent\b/', '$1 agency', (string) $post->{$column});

                if ($fixed !== null && $fixed !== $post->{$column}) {
                    DB::table('posts')->where('id', $post->id)->update([$column => $fixed]);
                }
            });
        }
    }

    public function down(): void
    {
        // Wording only; not worth reverting.
    }
};

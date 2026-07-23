<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR-0014: multilingual post content. The base columns (title/excerpt/body)
 * stay the default/fallback; per-locale overrides live in two JSON columns —
 * `translations` (lightweight title+excerpt, loaded on the public list) and
 * `body_translations` (heavy HTML, loaded only on the detail endpoint), so the
 * list keeps omitting the body.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->json('translations')->nullable()->after('body');
            $table->json('body_translations')->nullable()->after('translations');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['translations', 'body_translations']);
        });
    }
};

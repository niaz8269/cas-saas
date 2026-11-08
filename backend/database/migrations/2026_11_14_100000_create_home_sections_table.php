<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The sections of the public home page, in order. Built-in sections (hero, cities, ...) are seeded and can be
 * edited, hidden or reordered; custom ones (banner, text) can also be added and deleted by staff. `content`
 * holds only what was changed: anything left out falls back to the standard text.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_sections', function (Blueprint $t) {
            $t->id();
            $t->string('key', 40)->unique();      // hero, cities, ... or custom-xxxxxx
            $t->string('type', 20);               // built-in key, or banner | text
            $t->unsignedInteger('sort_order')->default(0);
            $t->boolean('is_visible')->default(true);
            $t->json('content')->nullable();
            $t->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();

            $t->index(['is_visible', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_sections');
    }
};

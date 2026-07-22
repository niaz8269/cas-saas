<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Content system (report — blogs / news / events). One unified `posts` table
 * with a `type` discriminator; event rows use the extra event_* columns.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20)->default('news');            // news|blog|event
            $table->string('title', 200);
            $table->string('slug', 220);
            $table->string('excerpt', 500)->nullable();
            $table->longText('body')->nullable();                    // sanitized HTML
            $table->string('cover_image_path', 255)->nullable();
            $table->string('category', 80)->nullable();
            $table->string('status', 20)->default('draft');          // draft|published
            $table->timestamp('published_at')->nullable();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            // Event-only fields
            $table->timestamp('event_date')->nullable();
            $table->string('location', 180)->nullable();
            $table->string('register_url', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('slug');
            $table->index(['type', 'status', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};

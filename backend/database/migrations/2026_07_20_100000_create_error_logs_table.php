<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Captured application errors for the admin error monitor. Grouped by a
 * fingerprint (class + file + line) so repeated failures collapse into one row
 * with an occurrence count and a last-seen timestamp, rather than flooding.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('error_logs', function (Blueprint $table) {
            $table->id();
            $table->string('fingerprint', 64)->unique();
            $table->string('level', 20)->default('error');   // error | critical | warning | client
            $table->string('type', 190)->nullable();          // exception class basename
            $table->text('message');
            $table->string('file', 500)->nullable();
            $table->unsignedInteger('line')->nullable();
            $table->string('url', 500)->nullable();
            $table->string('method', 10)->nullable();
            $table->unsignedSmallInteger('status')->nullable();
            $table->string('user_type', 30)->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->json('context')->nullable();              // trace, previous exceptions, extra
            $table->unsignedInteger('occurrences')->default(1);
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->unsignedBigInteger('resolved_by')->nullable();
            $table->timestamps();

            $table->index('level');
            $table->index('resolved_at');
            $table->index('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('error_logs');
    }
};

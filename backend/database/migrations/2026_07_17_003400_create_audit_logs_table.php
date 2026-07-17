<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Immutable audit trail (CLAUDE.md / report §4.7). The last table of the
 * 51-table contract.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 40);
            $table->string('auditable_type', 150);
            $table->unsignedBigInteger('auditable_id');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['auditable_type', 'auditable_id', 'created_at'], 'idx_audit_entity');
            $table->index(['user_id', 'created_at'], 'idx_audit_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};

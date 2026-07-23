<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR-0012: give the student & agent portals an in-app notification feed.
 * `notifications` was staff-only (user_id → users). Add nullable
 * student_id / agent_id recipients (mutually exclusive with user_id and
 * each other) so a single feed table serves all three guards. Existing
 * staff rows are untouched.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->unsignedBigInteger('student_id')->nullable()->after('user_id');
            $table->unsignedBigInteger('agent_id')->nullable()->after('student_id');

            $table->index(['student_id', 'read_at'], 'idx_notifications_student');
            $table->index(['agent_id', 'read_at'], 'idx_notifications_agent');

            $table->foreign('student_id', 'fk_notifications_student')
                ->references('id')->on('students')->cascadeOnDelete();
            $table->foreign('agent_id', 'fk_notifications_agent')
                ->references('id')->on('agents')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign('fk_notifications_student');
            $table->dropForeign('fk_notifications_agent');
            $table->dropIndex('idx_notifications_student');
            $table->dropIndex('idx_notifications_agent');
            $table->dropColumn(['student_id', 'agent_id']);
        });
    }
};

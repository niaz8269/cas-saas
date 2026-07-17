<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Task/Workflow/Communication system tables (report §5.9). `tasks` and
 * `activities` already exist from M3; these six complete the slice.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflow_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('entity_type', 60);
            $table->json('states')->nullable();
            $table->json('transitions')->nullable();
            $table->json('sla')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('workflow_transitions', function (Blueprint $table) {
            $table->id();
            $table->string('entity_type', 60);
            $table->unsignedBigInteger('entity_id');
            $table->string('from_state', 40)->nullable();
            $table->string('to_state', 40);
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['entity_type', 'entity_id', 'created_at'], 'idx_wt_entity');
        });

        Schema::create('automation_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->json('trigger_def')->nullable();
            $table->json('conditions')->nullable();
            $table->json('actions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('type', 80);
            $table->string('title', 190)->nullable();
            $table->text('body')->nullable();
            $table->json('channels')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['user_id', 'read_at'], 'idx_notifications_user');
            $table->foreign('user_id', 'fk_notifications_user')
                ->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('communications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id')->nullable();
            $table->string('channel', 20); // email|whatsapp|sms|in_app
            $table->string('direction', 10)->default('out');
            $table->string('template', 120)->nullable();
            $table->text('body')->nullable();
            $table->string('status', 20)->default('queued');
            $table->unsignedBigInteger('sent_by')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'created_at'], 'idx_comm_student');
            $table->foreign('student_id', 'fk_comm_student')->references('id')->on('students');
        });

        Schema::create('message_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('communication_id');
            $table->string('provider', 60)->nullable();
            $table->string('provider_msg_id', 150)->nullable();
            $table->string('status', 30)->nullable();
            $table->text('error')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index('communication_id', 'idx_msglogs_comm');
            $table->foreign('communication_id', 'fk_msglogs_comm')
                ->references('id')->on('communications')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_logs');
        Schema::dropIfExists('communications');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('automation_rules');
        Schema::dropIfExists('workflow_transitions');
        Schema::dropIfExists('workflow_definitions');
    }
};

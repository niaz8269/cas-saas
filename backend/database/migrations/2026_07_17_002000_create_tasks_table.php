<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title', 190);
            $table->text('description')->nullable();
            $table->unsignedBigInteger('assignee_id')->nullable();
            $table->unsignedBigInteger('student_id')->nullable();
            $table->string('related_type', 150)->nullable();
            $table->unsignedBigInteger('related_id')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->string('priority', 10)->default('normal');
            $table->string('status', 20)->default('open');
            $table->timestamp('escalated_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['assignee_id', 'status', 'due_at'], 'idx_tasks_assignee_status_due');
            $table->index('student_id', 'idx_tasks_student');
            $table->foreign('assignee_id', 'fk_tasks_assignee')->references('id')->on('users');
            $table->foreign('student_id', 'fk_tasks_student')->references('id')->on('students');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};

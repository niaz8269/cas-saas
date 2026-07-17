<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visa_cases', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('application_id');
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('assigned_visa_officer_id')->nullable();
            $table->string('status', 30)->default('not_started');
            $table->timestamp('appointment_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('decision_at')->nullable();
            $table->timestamp('travel_ready_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('application_id', 'idx_visa_app');
            $table->index('student_id', 'idx_visa_student');
            $table->index('status', 'idx_visa_status');
            $table->foreign('application_id', 'fk_visa_app')->references('id')->on('applications');
            $table->foreign('student_id', 'fk_visa_student')->references('id')->on('students');
            $table->foreign('assigned_visa_officer_id', 'fk_visa_officer')->references('id')->on('users');
        });

        Schema::create('visa_checklist_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('visa_case_id');
            $table->string('name', 150);
            $table->boolean('is_required')->default(true);
            $table->unsignedBigInteger('document_id')->nullable();
            $table->string('status', 20)->default('pending');
            $table->timestamps();

            $table->index('visa_case_id', 'idx_visaitems_case');
            $table->foreign('visa_case_id', 'fk_visaitems_case')
                ->references('id')->on('visa_cases')->cascadeOnDelete();
            $table->foreign('document_id', 'fk_visaitems_doc')->references('id')->on('documents');
        });

        Schema::create('visa_status_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('visa_case_id');
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->string('note', 500)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['visa_case_id', 'created_at'], 'idx_vsh_case');
            $table->foreign('visa_case_id', 'fk_vsh_case')
                ->references('id')->on('visa_cases')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visa_status_history');
        Schema::dropIfExists('visa_checklist_items');
        Schema::dropIfExists('visa_cases');
    }
};

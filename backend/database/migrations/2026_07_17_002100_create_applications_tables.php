<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_code', 40);
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('university_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('intake_id')->nullable();
            $table->unsignedBigInteger('scholarship_id')->nullable();
            $table->unsignedBigInteger('agent_id')->nullable();
            $table->unsignedBigInteger('assigned_admissions_id')->nullable();
            $table->string('status', 30)->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('application_code', 'uq_applications_code');
            $table->index('student_id', 'idx_apps_student');
            $table->index(['status', 'assigned_admissions_id'], 'idx_apps_status_admissions');
            $table->index('university_id', 'idx_apps_uni');
            $table->index('course_id', 'idx_apps_course');
            $table->foreign('student_id', 'fk_apps_student')->references('id')->on('students');
            $table->foreign('university_id', 'fk_apps_uni')->references('id')->on('universities');
            $table->foreign('course_id', 'fk_apps_course')->references('id')->on('courses');
            $table->foreign('intake_id', 'fk_apps_intake')->references('id')->on('intakes');
            $table->foreign('scholarship_id', 'fk_apps_scholarship')->references('id')->on('scholarships');
            $table->foreign('agent_id', 'fk_apps_agent')->references('id')->on('agents');
            $table->foreign('assigned_admissions_id', 'fk_apps_admissions')->references('id')->on('users');
        });

        Schema::create('application_status_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('application_id');
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->string('note', 500)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['application_id', 'created_at'], 'idx_ash_app');
            $table->foreign('application_id', 'fk_ash_app')
                ->references('id')->on('applications')->cascadeOnDelete();
            $table->foreign('changed_by', 'fk_ash_user')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_status_history');
        Schema::dropIfExists('applications');
    }
};

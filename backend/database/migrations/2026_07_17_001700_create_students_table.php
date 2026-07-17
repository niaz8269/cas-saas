<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('student_code', 40);
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('email', 190)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('passport_no', 50)->nullable();
            $table->date('dob')->nullable();
            $table->string('gender', 15)->nullable();
            $table->unsignedBigInteger('country_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('agent_id')->nullable();
            $table->unsignedBigInteger('assigned_counselor_id')->nullable();
            $table->string('status', 20)->default('active');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('student_code', 'uq_students_code');
            $table->index('passport_no', 'idx_students_passport');
            $table->index('email', 'idx_students_email');
            $table->index('phone', 'idx_students_phone');
            $table->index('assigned_counselor_id', 'idx_students_counselor');
            $table->index('agent_id', 'idx_students_agent');
            $table->index('status', 'idx_students_status');
            $table->foreign('country_id', 'fk_students_country')->references('id')->on('countries');
            $table->foreign('branch_id', 'fk_students_branch')->references('id')->on('branches');
            $table->foreign('agent_id', 'fk_students_agent')->references('id')->on('agents');
            $table->foreign('assigned_counselor_id', 'fk_students_counselor')->references('id')->on('users');
        });

        Schema::create('student_guardians', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->string('name', 150);
            $table->string('relation', 50)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email', 190)->nullable();
            $table->timestamps();

            $table->index('student_id', 'idx_guardians_student');
            $table->foreign('student_id', 'fk_guardians_student')
                ->references('id')->on('students')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_guardians');
        Schema::dropIfExists('students');
    }
};

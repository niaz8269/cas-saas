<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR-0008: applicant intake fields for the portal application-submission
 * wizard. Extended personal details on the student, an occupation on each
 * guardian, and a prior-education history table. All additive and nullable
 * so existing records are untouched.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('marital_status', 20)->nullable()->after('gender');
            $table->string('religion', 60)->nullable()->after('marital_status');
            $table->string('place_of_birth', 120)->nullable()->after('dob');
            $table->date('passport_issue_date')->nullable()->after('passport_no');
            $table->date('passport_expiry_date')->nullable()->after('passport_issue_date');
            $table->string('permanent_address', 255)->nullable();
            $table->string('current_address', 255)->nullable();
            $table->string('city', 120)->nullable();
            $table->string('postal_code', 20)->nullable();
        });

        Schema::table('student_guardians', function (Blueprint $table) {
            $table->string('occupation', 120)->nullable()->after('relation');
        });

        Schema::create('student_education', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('level', 40)->nullable();
            $table->string('degree_name', 150)->nullable();
            $table->string('institution', 190)->nullable();
            $table->string('board_or_university', 190)->nullable();
            $table->foreignId('country_id')->nullable()->constrained('countries');
            $table->string('major', 150)->nullable();
            $table->unsignedSmallInteger('start_year')->nullable();
            $table->unsignedSmallInteger('end_year')->nullable();
            $table->string('grade_type', 20)->nullable();
            $table->string('grade_value', 30)->nullable();
            $table->boolean('is_completed')->default(true);
            $table->timestamps();

            $table->index('student_id', 'idx_studenteducation_student');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_education');

        Schema::table('student_guardians', function (Blueprint $table) {
            $table->dropColumn('occupation');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'marital_status',
                'religion',
                'place_of_birth',
                'passport_issue_date',
                'passport_expiry_date',
                'permanent_address',
                'current_address',
                'city',
                'postal_code',
            ]);
        });
    }
};

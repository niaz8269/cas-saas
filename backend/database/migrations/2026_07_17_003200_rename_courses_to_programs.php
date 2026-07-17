<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rename courses → programs (ADR-0006). In-place so existing data is
 * preserved; the create-migrations remain as history. Also adds the two
 * new program fields.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('courses', 'programs');

        Schema::table('applications', function (Blueprint $table) {
            $table->renameColumn('course_id', 'program_id');
        });
        Schema::table('intakes', function (Blueprint $table) {
            $table->renameColumn('course_id', 'program_id');
        });
        Schema::table('university_agreements', function (Blueprint $table) {
            $table->renameColumn('course_id', 'program_id');
        });

        Schema::table('programs', function (Blueprint $table) {
            $table->string('teaching_language', 60)->nullable()->after('level');
            $table->string('apply_link', 255)->nullable()->after('currency');
        });
    }

    public function down(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            $table->dropColumn(['teaching_language', 'apply_link']);
        });

        Schema::table('university_agreements', function (Blueprint $table) {
            $table->renameColumn('program_id', 'course_id');
        });
        Schema::table('intakes', function (Blueprint $table) {
            $table->renameColumn('program_id', 'course_id');
        });
        Schema::table('applications', function (Blueprint $table) {
            $table->renameColumn('program_id', 'course_id');
        });

        Schema::rename('programs', 'courses');
    }
};

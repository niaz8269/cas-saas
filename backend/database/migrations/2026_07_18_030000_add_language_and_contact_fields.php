<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR-0009: richer application form. English-proficiency test on the student
 * and an address on contacts (so an emergency contact — a guardian row with
 * relation "Emergency contact" — can carry one). Additive and nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('english_test', 30)->nullable()->after('religion');
            $table->string('english_test_score', 30)->nullable()->after('english_test');
            $table->date('english_test_date')->nullable()->after('english_test_score');
        });

        Schema::table('student_guardians', function (Blueprint $table) {
            $table->string('address', 255)->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('student_guardians', function (Blueprint $table) {
            $table->dropColumn('address');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['english_test', 'english_test_score', 'english_test_date']);
        });
    }
};

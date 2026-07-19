<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A second application kind: a general government-scholarship application
 * (e.g. CSC) that has no exact program/university — the applicant picks a
 * degree level, the scholarship, and up to three major/university
 * preferences (subject to approval). Adds a majors reference list.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->string('kind', 20)->default('program')->after('application_code');
            $table->string('level', 20)->nullable()->after('kind');
            $table->json('preferences')->nullable()->after('scholarship_id');
            $table->unsignedBigInteger('university_id')->nullable()->change();
            $table->unsignedBigInteger('program_id')->nullable()->change();
        });

        Schema::create('majors', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->unique();
            $table->string('status', 20)->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('majors');

        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn(['kind', 'level', 'preferences']);
        });
    }
};

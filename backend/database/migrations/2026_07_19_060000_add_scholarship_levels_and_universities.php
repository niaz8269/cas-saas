<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Government/national scholarships: per-degree-level benefits (a JSON matrix
 * of bachelor|master|phd × tuition_after/hostel_after/stipend_monthly) and a
 * link to the universities that enrol students under the award.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scholarships', function (Blueprint $table) {
            $table->json('benefits')->nullable()->after('stipend_monthly');
        });

        Schema::create('scholarship_universities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scholarship_id')->constrained('scholarships')->cascadeOnDelete();
            $table->foreignId('university_id')->constrained('universities')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['scholarship_id', 'university_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scholarship_universities');

        Schema::table('scholarships', function (Blueprint $table) {
            $table->dropColumn('benefits');
        });
    }
};

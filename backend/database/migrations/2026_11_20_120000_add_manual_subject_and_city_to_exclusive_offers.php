<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * An exclusive can name a program, scholarship or university that is not in the catalog (typed by hand), or be
 * about a city or province with a list of programs, without naming any university.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exclusive_offers', function (Blueprint $table) {
            $table->string('custom_name', 200)->nullable()->after('scholarship_id');
            $table->string('custom_university', 200)->nullable()->after('custom_name');
            $table->string('city', 100)->nullable()->after('custom_university');
            $table->string('province', 100)->nullable()->after('city');
            $table->json('programs_list')->nullable()->after('province');
        });
    }

    public function down(): void
    {
        Schema::table('exclusive_offers', function (Blueprint $table) {
            $table->dropColumn(['custom_name', 'custom_university', 'city', 'province', 'programs_list']);
        });
    }
};

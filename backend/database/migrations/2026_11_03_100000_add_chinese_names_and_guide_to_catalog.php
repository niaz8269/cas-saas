<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Chinese names and province for universities, the CSC-listed flag and Chinese
 * name for programs, and a structured guide (curated sections: fees,
 * scholarships, documents, recognition) for universities that have one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->string('name_zh', 190)->nullable()->after('name');
            $table->string('province', 60)->nullable()->after('city');
            $table->json('guide')->nullable()->after('about');
        });

        Schema::table('programs', function (Blueprint $table) {
            $table->string('name_zh', 190)->nullable()->after('name');
            $table->boolean('csc_listed')->default(false)->after('level');
        });
    }

    public function down(): void
    {
        Schema::table('universities', fn (Blueprint $t) => $t->dropColumn(['name_zh', 'province', 'guide']));
        Schema::table('programs', fn (Blueprint $t) => $t->dropColumn(['name_zh', 'csc_listed']));
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Scholarships are either internal to a university (scope=university, the
 * default) or government/national awards (scope=government) with no single
 * university — so university_id becomes nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scholarships', function (Blueprint $table) {
            $table->string('scope', 20)->default('university')->after('university_id');
            $table->unsignedBigInteger('university_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('scholarships', function (Blueprint $table) {
            $table->dropColumn('scope');
        });
    }
};

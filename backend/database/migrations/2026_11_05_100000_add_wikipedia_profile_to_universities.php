<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Basic institution facts and the Wikipedia article they were taken from
 * (the article text is CC BY-SA, so the link is kept for attribution).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->unsignedSmallInteger('founded_year')->nullable()->after('moe_mbbs_source_url');
            $table->string('institution_type', 40)->nullable()->after('founded_year');
            $table->string('student_count', 40)->nullable()->after('institution_type');
            $table->string('wikipedia_url', 500)->nullable()->after('student_count');
            // True when cover_path is a photo of the city (no campus photo was available), not of the campus.
            $table->boolean('cover_is_city')->default(false)->after('cover_source_url');
        });
    }

    public function down(): void
    {
        Schema::table('universities', fn (Blueprint $t) => $t->dropColumn(['founded_year', 'institution_type', 'student_count', 'wikipedia_url', 'cover_is_city']));
    }
};

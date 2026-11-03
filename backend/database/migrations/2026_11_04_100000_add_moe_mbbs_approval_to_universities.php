<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "MoE-listed" means: on the Ministry of Education's annual list of universities
 * approved to enrol English-taught MBBS students. Record which academic year
 * the approval is for and the document it comes from.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->string('moe_mbbs_year', 9)->nullable()->after('moe_listed');
            $table->string('moe_mbbs_source_url', 500)->nullable()->after('moe_mbbs_year');
        });
    }

    public function down(): void
    {
        Schema::table('universities', fn (Blueprint $t) => $t->dropColumn(['moe_mbbs_year', 'moe_mbbs_source_url']));
    }
};

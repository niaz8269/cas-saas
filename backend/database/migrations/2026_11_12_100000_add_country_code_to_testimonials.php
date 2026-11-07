<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** The nationality as an ISO country code, so a testimonial can be placed on the globe. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('testimonials', function (Blueprint $t) {
            $t->char('country_code', 2)->nullable()->after('country')->index();
        });
    }

    public function down(): void
    {
        Schema::table('testimonials', function (Blueprint $t) {
            $t->dropColumn('country_code');
        });
    }
};

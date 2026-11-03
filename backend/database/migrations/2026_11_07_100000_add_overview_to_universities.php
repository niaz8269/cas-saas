<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A long, sectioned overview per university (history, campus, academics, the
 * city, programs, admission), shown on the Overview tab.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->json('overview')->nullable()->after('about');
        });
    }

    public function down(): void
    {
        Schema::table('universities', fn (Blueprint $t) => $t->dropColumn('overview'));
    }
};

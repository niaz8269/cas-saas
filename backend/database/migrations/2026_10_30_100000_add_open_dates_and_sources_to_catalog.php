<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admission windows need an opening date, and every published catalog fact
 * carries the official page it came from and the day it was last checked.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('intakes', function (Blueprint $table) {
            $table->date('application_open_date')->nullable()->after('start_date');
            $table->string('source_url', 500)->nullable()->after('status');
            $table->date('verified_on')->nullable()->after('source_url');
        });

        Schema::table('scholarships', function (Blueprint $table) {
            $table->date('application_open_date')->nullable()->after('deadline');
            $table->string('source_url', 500)->nullable()->after('apply_link');
            $table->date('verified_on')->nullable()->after('source_url');
        });

        Schema::table('programs', function (Blueprint $table) {
            $table->string('source_url', 500)->nullable()->after('apply_link');
            $table->date('verified_on')->nullable()->after('source_url');
        });
    }

    public function down(): void
    {
        Schema::table('intakes', fn (Blueprint $t) => $t->dropColumn(['application_open_date', 'source_url', 'verified_on']));
        Schema::table('scholarships', fn (Blueprint $t) => $t->dropColumn(['application_open_date', 'source_url', 'verified_on']));
        Schema::table('programs', fn (Blueprint $t) => $t->dropColumn(['source_url', 'verified_on']));
    }
};

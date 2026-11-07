<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Evidence that an account holder agreed to the Terms and Privacy Policy, and which version. */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['students', 'agents'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->timestamp('terms_accepted_at')->nullable();
                $t->string('terms_version', 20)->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['students', 'agents'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn(['terms_accepted_at', 'terms_version']);
            });
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR-0010: per-course CAS service charges — a small matrix keyed by funding
 * (self | scholarship | partial) × applicant (student | agent), plus a
 * currency. Display-only for now (course is the source of truth; Finance
 * invoices later). Stored as JSON to match programs.requirements.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            $table->json('service_charges')->nullable()->after('requirements');
        });
    }

    public function down(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            $table->dropColumn('service_charges');
        });
    }
};

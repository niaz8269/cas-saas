<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR-0015 (audience-aware site, Phase 2): admin-configurable field × audience
 * visibility. A `visibility` JSON map on the catalog records — per gateable
 * section, the list of audiences allowed to see it:
 *   { "fee": ["student","agent","counselor"], "amount": ["public", ...] }
 * A section left unset falls back to the Phase-1 default (registered-only).
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['universities', 'programs', 'scholarships'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->json('visibility')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['universities', 'programs', 'scholarships'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('visibility');
            });
        }
    }
};

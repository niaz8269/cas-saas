<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A JSON bag for admission-form fields that a partner site collects but the ERP
 * has no dedicated column for. Known fields still map to real columns; anything
 * extra is preserved here and shown generically, so a new partner field never
 * requires a schema change or silently drops data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->json('custom_fields')->nullable()->after('review');
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn('custom_fields');
        });
    }
};

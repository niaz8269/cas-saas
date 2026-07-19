<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which external form a lead came from (contact, consultation, event
 * registration, …) so the team can triage and segment. Form-specific answers
 * (event name/date, preferred time, etc.) are kept in the existing meta JSON
 * under `form`; this column is the queryable/filterable classifier.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->string('form_type', 40)->nullable()->after('intake_route');
            $table->index('form_type', 'idx_leads_form_type');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex('idx_leads_form_type');
            $table->dropColumn('form_type');
        });
    }
};

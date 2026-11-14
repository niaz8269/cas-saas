<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Who submitted an application: 'student' (themselves), 'agent' (a partner on the student's behalf), 'staff' (entered
 * in the admin panel) or 'ingest' (a website form / API source).
 *
 * Existing rows are labelled only where that can be known for certain. A student who belongs to a partner could have
 * applied alone or through the partner, and nothing was stored then, so those stay empty (shown as "not recorded")
 * rather than being guessed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->string('submitted_via', 10)->nullable()->after('agent_id');
            $table->index('submitted_via', 'idx_applications_submitted_via');
        });

        DB::table('applications')->whereNotNull('created_by')->update(['submitted_via' => 'staff']);
        DB::table('applications')->whereNull('submitted_via')->whereNotNull('source_id')->update(['submitted_via' => 'ingest']);
        DB::table('applications')->whereNull('submitted_via')->whereNull('agent_id')->update(['submitted_via' => 'student']);
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropIndex('idx_applications_submitted_via');
            $table->dropColumn('submitted_via');
        });
    }
};

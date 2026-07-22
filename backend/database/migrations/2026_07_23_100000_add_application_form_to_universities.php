<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-university application-form config: the admin-defined custom fields +
 * required documents a student fills when applying to this university. When
 * set, it drives the submission wizard's custom fields and required documents
 * (overriding the per-program config). Shape:
 *   { "fields": [{key,label,type,required,options}], "documents": [<doc_type_id>] }
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->json('application_form')->nullable()->after('requirements');
        });
    }

    public function down(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->dropColumn('application_form');
        });
    }
};

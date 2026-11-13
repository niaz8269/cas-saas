<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A short instruction line on each document type ("Master: 800-1000 words"), shown to applicants next to the upload.
 * The Master's / PhD scholarship checklist itself is data: see PostgraduateScholarshipDocumentsSeeder.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_types', function (Blueprint $table) {
            $table->string('instruction', 255)->nullable()->after('category');
        });
    }

    public function down(): void
    {
        Schema::table('document_types', fn (Blueprint $table) => $table->dropColumn('instruction'));
    }
};

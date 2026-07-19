<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Direct university-admission application ingestion: a partner site (e.g. the
 * Xinjiang Medical MBBS site) POSTs a full application via its API key. The
 * key's source is tied to a university + default program, and ingested
 * applications are tagged with the source and flagged for verification.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('api_sources', function (Blueprint $table) {
            $table->foreignId('university_id')->nullable()->after('type')->constrained('universities')->nullOnDelete();
            $table->foreignId('default_program_id')->nullable()->after('university_id')->constrained('programs')->nullOnDelete();
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->foreignId('source_id')->nullable()->after('agent_id')->constrained('api_sources')->nullOnDelete();
            $table->boolean('review')->default(false)->after('status');
        });

        // Extra applicant profile fields that partner forms (e.g. XJMU) collect
        // but the ERP had no home for yet.
        Schema::table('students', function (Blueprint $table) {
            $table->string('chinese_name', 120)->nullable()->after('last_name');
            $table->string('native_language', 60)->nullable()->after('religion');
            $table->string('alternate_email', 190)->nullable()->after('email');
            $table->string('wechat_id', 80)->nullable()->after('phone');
            $table->string('skype_id', 80)->nullable()->after('wechat_id');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['chinese_name', 'native_language', 'alternate_email', 'wechat_id', 'skype_id']);
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('source_id');
            $table->dropColumn('review');
        });

        Schema::table('api_sources', function (Blueprint $table) {
            $table->dropConstrainedForeignId('university_id');
            $table->dropConstrainedForeignId('default_program_id');
        });
    }
};

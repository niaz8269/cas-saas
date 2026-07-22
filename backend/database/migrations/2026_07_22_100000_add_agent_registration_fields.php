<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Partner self-registration details (report — agent signup + admin approval).
 * Agents apply with their company/agency profile; admin reviews pending
 * requests and approves (status active) or rejects them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->string('contact_name', 150)->nullable()->after('name');
            $table->string('website', 190)->nullable()->after('phone');
            $table->string('address', 255)->nullable()->after('website');
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropColumn(['contact_name', 'website', 'address']);
        });
    }
};

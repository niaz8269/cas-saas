<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // An invoice for someone who is not in the portal (party_type 'external'): there is no student, agent or
        // university record behind it, so who it is billed to is written on the invoice itself.
        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedBigInteger('party_id')->nullable()->change();
            $table->string('bill_to_name', 160)->nullable()->after('party_id');
            $table->string('bill_to_email', 190)->nullable()->after('bill_to_name');
            $table->string('bill_to_phone', 64)->nullable()->after('bill_to_email');
            $table->string('bill_to_address', 255)->nullable()->after('bill_to_phone');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['bill_to_name', 'bill_to_email', 'bill_to_phone', 'bill_to_address']);
        });
    }
};

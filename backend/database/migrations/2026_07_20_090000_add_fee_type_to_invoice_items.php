<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Categorises each invoice line (tuition, hostel, service_charge, admission_fee,
 * visa_fee, …) so Finance can build and report invoices by fee type. Lines are
 * still described by free-text `description`; this is the machine-readable tag.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->string('fee_type', 40)->nullable()->after('invoice_id');
        });
    }

    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn('fee_type');
        });
    }
};

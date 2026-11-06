<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The account the system picks for invoices it raises itself (the
        // application fee), where nobody is there to choose one.
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->boolean('is_default')->default(false)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->dropColumn('is_default');
        });
    }
};

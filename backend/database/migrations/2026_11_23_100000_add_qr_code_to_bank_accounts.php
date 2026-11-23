<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // An optional payment QR code (Alipay, WeChat Pay, a bank's own) shown next to the account details.
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->string('qr_code_path', 255)->nullable()->after('instructions');
        });
    }

    public function down(): void
    {
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->dropColumn('qr_code_path');
        });
    }
};

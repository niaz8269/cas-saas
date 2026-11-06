<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // CAS receipt accounts. Finance adds as many as needed; whoever raises
        // an invoice picks which one that invoice is paid into.
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('label', 120);             // internal name, e.g. "BOC CNY, Shanghai"
            $table->string('bank_name', 160);
            $table->string('account_name', 160);
            $table->string('account_number', 64);
            $table->string('iban', 64)->nullable();
            $table->string('swift', 32)->nullable();
            $table->string('bank_address', 255)->nullable();
            $table->char('currency', 3)->nullable();  // informational; null = any
            $table->text('instructions')->nullable(); // e.g. reference format, remittance notes
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'sort_order'], 'idx_bank_accounts_active');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedBigInteger('bank_account_id')->nullable()->after('application_id');
            $table->foreign('bank_account_id', 'fk_invoices_bank_account')
                ->references('id')->on('bank_accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign('fk_invoices_bank_account');
            $table->dropColumn('bank_account_id');
        });
        Schema::dropIfExists('bank_accounts');
    }
};

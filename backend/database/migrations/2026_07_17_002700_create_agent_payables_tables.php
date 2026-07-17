<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_payables', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('commission_id');
            $table->unsignedBigInteger('agent_id');
            $table->decimal('amount', 15, 2)->default(0);
            $table->char('currency', 3)->default('USD');
            $table->string('status', 20)->default('payable'); // payable|paid
            $table->timestamp('computed_at')->nullable();
            $table->timestamps();

            $table->index('commission_id', 'idx_payables_commission');
            $table->index('agent_id', 'idx_payables_agent');
            $table->foreign('commission_id', 'fk_payables_commission')->references('id')->on('commissions');
            $table->foreign('agent_id', 'fk_payables_agent')->references('id')->on('agents');
        });

        Schema::create('agent_payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('agent_payable_id');
            $table->decimal('amount', 15, 2);
            $table->string('method', 40)->nullable();
            $table->string('reference', 120)->nullable();
            $table->unsignedBigInteger('document_id')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->timestamps();

            $table->index('agent_payable_id', 'idx_agentpay_payable');
            $table->foreign('agent_payable_id', 'fk_agentpay_payable')->references('id')->on('agent_payables');
            $table->foreign('document_id', 'fk_agentpay_doc')->references('id')->on('documents');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_payments');
        Schema::dropIfExists('agent_payables');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_no', 50);
            $table->unsignedBigInteger('invoice_id');
            $table->decimal('amount', 15, 2);
            $table->char('currency', 3)->default('USD');
            $table->string('method', 40)->nullable();
            $table->string('reference', 120)->nullable();
            $table->unsignedBigInteger('document_id')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->timestamps();

            $table->unique('payment_no', 'uq_payments_no');
            $table->index('invoice_id', 'idx_payments_inv');
            $table->foreign('invoice_id', 'fk_payments_inv')->references('id')->on('invoices');
            $table->foreign('document_id', 'fk_payments_doc')->references('id')->on('documents');
            $table->foreign('recorded_by', 'fk_payments_user')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};

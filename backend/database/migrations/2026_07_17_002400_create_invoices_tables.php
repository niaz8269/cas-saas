<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_no', 50);
            $table->string('party_type', 20); // student|agent|university
            $table->unsignedBigInteger('party_id');
            $table->unsignedBigInteger('application_id')->nullable();
            $table->char('currency', 3)->default('USD');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->decimal('amount_paid', 15, 2)->default(0);
            $table->string('status', 20)->default('draft');
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('invoice_no', 'uq_invoices_no');
            $table->index(['party_type', 'party_id'], 'idx_invoices_party');
            $table->index('status', 'idx_invoices_status');
            $table->index('application_id', 'idx_invoices_app');
            $table->foreign('application_id', 'fk_invoices_app')->references('id')->on('applications');
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('invoice_id');
            $table->string('description', 255);
            $table->decimal('qty', 10, 2)->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('amount', 15, 2)->default(0);

            $table->index('invoice_id', 'idx_invitems_inv');
            $table->foreign('invoice_id', 'fk_invitems_inv')
                ->references('id')->on('invoices')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
    }
};

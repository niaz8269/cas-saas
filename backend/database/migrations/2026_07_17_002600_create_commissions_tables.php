<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('application_id');
            $table->unsignedBigInteger('university_id');
            $table->unsignedBigInteger('agreement_id')->nullable();
            $table->char('currency', 3)->default('USD');
            $table->decimal('expected_amount', 15, 2)->default(0);
            $table->decimal('eligible_amount', 15, 2)->default(0);
            $table->decimal('invoiced_amount', 15, 2)->default(0);
            $table->decimal('received_amount', 15, 2)->default(0);
            $table->string('status', 20)->default('expected');
            $table->timestamp('eligibility_confirmed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('application_id', 'uq_commissions_app');
            $table->index(['status', 'university_id'], 'idx_commissions_status_uni');
            $table->foreign('application_id', 'fk_commissions_app')->references('id')->on('applications');
            $table->foreign('university_id', 'fk_commissions_uni')->references('id')->on('universities');
            $table->foreign('agreement_id', 'fk_commissions_agreement')->references('id')->on('university_agreements');
        });

        Schema::create('commission_status_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('commission_id');
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->decimal('amount', 15, 2)->nullable();
            $table->string('reference', 120)->nullable();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['commission_id', 'created_at'], 'idx_csh_commission');
            $table->foreign('commission_id', 'fk_csh_commission')
                ->references('id')->on('commissions')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commission_status_history');
        Schema::dropIfExists('commissions');
    }
};

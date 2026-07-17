<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('application_id');
            $table->string('offer_type', 20)->default('conditional'); // conditional|unconditional
            $table->string('reference_no', 80)->nullable();
            $table->date('issued_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->unsignedBigInteger('document_id')->nullable();
            $table->string('status', 20)->default('issued');
            $table->timestamps();

            $table->index('application_id', 'idx_offers_app');
            $table->foreign('application_id', 'fk_offers_app')
                ->references('id')->on('applications')->cascadeOnDelete();
            $table->foreign('document_id', 'fk_offers_doc')->references('id')->on('documents');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offers');
    }
};

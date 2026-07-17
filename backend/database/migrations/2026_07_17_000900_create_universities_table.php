<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('universities', function (Blueprint $table) {
            $table->id();
            $table->string('name', 190);
            $table->string('code', 40);
            $table->unsignedBigInteger('country_id')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('website', 190)->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->unique('code', 'uq_universities_code');
            $table->foreign('country_id', 'fk_universities_country')->references('id')->on('countries');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('universities');
    }
};

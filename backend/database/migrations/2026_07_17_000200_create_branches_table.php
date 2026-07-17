<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('code', 30);
            $table->unsignedBigInteger('country_id')->nullable();
            $table->string('city', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique('code', 'uq_branches_code');
            $table->index('country_id', 'idx_branches_country');
            $table->foreign('country_id', 'fk_branches_country')->references('id')->on('countries');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};

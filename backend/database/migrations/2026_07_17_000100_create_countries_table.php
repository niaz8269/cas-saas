<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('countries', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->char('iso2', 2);
            $table->string('phone_code', 8)->nullable();
            $table->timestamps();

            $table->unique('iso2', 'uq_countries_iso2');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('countries');
    }
};

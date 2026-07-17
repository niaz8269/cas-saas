<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 150);
            $table->json('value')->nullable();
            $table->string('group', 80)->nullable();
            $table->timestamps();

            $table->unique('key', 'uq_settings_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};

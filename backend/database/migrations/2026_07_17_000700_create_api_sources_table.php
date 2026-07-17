<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_sources', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('type', 30)->default('website'); // website|agent|campaign|manual
            $table->string('website_url', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_sources');
    }
};

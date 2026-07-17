<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_sources', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('channel', 60)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->unsignedBigInteger('marketing_source_id')->nullable();
            $table->string('utm_source', 120)->nullable();
            $table->string('utm_medium', 120)->nullable();
            $table->string('utm_campaign', 120)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('marketing_source_id', 'idx_campaigns_ms');
            $table->foreign('marketing_source_id', 'fk_campaigns_ms')->references('id')->on('marketing_sources');
        });

        Schema::create('website_sources', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('api_source_id')->nullable();
            $table->string('domain', 190);
            $table->string('university_focus', 190)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('domain', 'uq_website_domain');
            $table->index('api_source_id', 'idx_website_source');
            $table->foreign('api_source_id', 'fk_website_source')->references('id')->on('api_sources');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_sources');
        Schema::dropIfExists('campaigns');
        Schema::dropIfExists('marketing_sources');
    }
};

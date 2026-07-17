<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('api_source_id');
            $table->string('key_hash', 255);
            $table->json('scopes')->nullable();
            $table->unsignedInteger('rate_limit')->default(60);
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->unique('key_hash', 'uq_api_keys_hash');
            $table->index('api_source_id', 'idx_api_keys_source');
            $table->foreign('api_source_id', 'fk_apikeys_source')->references('id')->on('api_sources');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_keys');
    }
};

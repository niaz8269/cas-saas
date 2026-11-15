<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('city_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 120)->unique();
            $table->string('city', 120);
            $table->string('province', 120)->nullable();
            // Opening paragraph(s) of the city's description.
            $table->text('summary')->nullable();
            // [{"group": "history|places|geography|economy|culture|education|transport|people", "h": "...", "level": 2, "blocks": [{"t": "p|li", "x": "..."}]}]
            $table->json('sections')->nullable();
            // Where the text comes from, shown on the page (the Wikipedia article is CC BY-SA 4.0).
            $table->string('source_url', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('city_profiles');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The items staff chose, and ordered by hand, for the home page: the three universities in the hero, and the
 * rows of each tab of the "+" panel (universities, programs, scholarships, stories). A list with no rows means
 * the site picks automatically, as before.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_spotlight_items', function (Blueprint $table) {
            $table->id();
            $table->string('list', 30);
            $table->unsignedBigInteger('item_id');
            $table->unsignedSmallInteger('position');
            $table->timestamps();

            $table->unique(['list', 'item_id']);
            $table->index(['list', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_spotlight_items');
    }
};

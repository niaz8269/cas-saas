<?php

use Database\Seeders\CountrySeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * The countries table held only the 23 recruitment markets, so the agent sign-up form (and every other country
 * picker that reads it) lacked most of the world. This adds the rest. Existing rows are untouched; Israel and
 * uninhabited territories are not added.
 */
return new class extends Migration
{
    public function up(): void
    {
        CountrySeeder::addRemaining();
    }

    public function down(): void
    {
        // Nothing to undo: countries that people may already have chosen stay.
    }
};

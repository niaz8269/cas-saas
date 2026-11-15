<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            // Position on the public home page (1 = first). Null = not chosen for the home page.
            $table->unsignedSmallInteger('home_rank')->nullable()->index()->after('visibility');
        });
    }

    public function down(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->dropColumn('home_rank');
        });
    }
};

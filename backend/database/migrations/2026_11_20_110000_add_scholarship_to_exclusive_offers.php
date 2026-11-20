<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** An exclusive can also be a scholarship: the one it is about. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exclusive_offers', function (Blueprint $table) {
            $table->foreignId('scholarship_id')->nullable()->after('program_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('exclusive_offers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('scholarship_id');
        });
    }
};

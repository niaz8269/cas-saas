<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            // A major the university has registered with the Ministry of Education, with no
            // confirmed international-student details (language, fees, dates) yet.
            $table->boolean('registry_only')->default(false)->after('csc_listed');
        });
    }

    public function down(): void
    {
        Schema::table('programs', fn (Blueprint $table) => $table->dropColumn('registry_only'));
    }
};

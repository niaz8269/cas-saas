<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A square crop of the university's seal, used where the full (usually wide)
 * logo does not fit, e.g. round avatars on the home page hero.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->string('emblem_path', 255)->nullable()->after('logo_path');
        });
    }

    public function down(): void
    {
        Schema::table('universities', fn (Blueprint $t) => $t->dropColumn('emblem_path'));
    }
};

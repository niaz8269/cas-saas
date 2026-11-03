<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cover photos carry their author/licence credit and a link to the source
 * page, shown wherever the photo is displayed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->string('cover_credit', 255)->nullable()->after('cover_path');
            $table->string('cover_source_url', 500)->nullable()->after('cover_credit');
        });
    }

    public function down(): void
    {
        Schema::table('universities', fn (Blueprint $t) => $t->dropColumn(['cover_credit', 'cover_source_url']));
    }
};

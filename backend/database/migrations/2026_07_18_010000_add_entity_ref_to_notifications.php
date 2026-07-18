<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A notification may reference the record it is about (application, student,
 * lead, visa case, university) so the in-app bell can link straight to it.
 * Polymorphic and nullable — system notices without a target stay linkless.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('entity_type', 40)->nullable()->after('body');
            $table->unsignedBigInteger('entity_id')->nullable()->after('entity_type');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn(['entity_type', 'entity_id']);
        });
    }
};

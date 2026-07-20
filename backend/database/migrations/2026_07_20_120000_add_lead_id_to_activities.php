<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Let activities attach to a lead as well as a student, so calls/notes can be
 * logged during pre-conversion nurturing. student_id becomes nullable; a
 * nullable lead_id is added. An activity belongs to one or the other.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->unsignedBigInteger('student_id')->nullable()->change();
            $table->unsignedBigInteger('lead_id')->nullable()->after('student_id');
            $table->foreign('lead_id', 'fk_activities_lead')->references('id')->on('leads')->nullOnDelete();
            $table->index(['lead_id', 'created_at'], 'idx_activities_lead');
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropForeign('fk_activities_lead');
            $table->dropIndex('idx_activities_lead');
            $table->dropColumn('lead_id');
            $table->unsignedBigInteger('student_id')->nullable(false)->change();
        });
    }
};

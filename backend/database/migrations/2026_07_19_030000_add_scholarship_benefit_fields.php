<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Concrete benefits a scholarship confers: the tuition and hostel a student
 * pays after the award, and an optional monthly stipend. Same currency as the
 * scholarship. Additive and nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scholarships', function (Blueprint $table) {
            $table->decimal('tuition_after', 15, 2)->nullable()->after('amount');
            $table->decimal('hostel_after', 15, 2)->nullable()->after('tuition_after');
            $table->decimal('stipend_monthly', 15, 2)->nullable()->after('hostel_after');
        });
    }

    public function down(): void
    {
        Schema::table('scholarships', function (Blueprint $table) {
            $table->dropColumn(['tuition_after', 'hostel_after', 'stipend_monthly']);
        });
    }
};

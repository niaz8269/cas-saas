<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Scholarship website content fields (ADR-0007).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scholarships', function (Blueprint $table) {
            $table->string('slug', 190)->nullable()->unique()->after('name');
            $table->text('description')->nullable()->after('slug');
            $table->decimal('amount', 15, 2)->nullable()->after('coverage');
            $table->char('currency', 3)->nullable()->after('amount');
            $table->text('eligibility')->nullable();
            $table->text('how_to_apply')->nullable();
            $table->string('apply_link', 255)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('scholarships', function (Blueprint $table) {
            $table->dropColumn([
                'slug', 'description', 'amount', 'currency', 'eligibility', 'how_to_apply', 'apply_link',
            ]);
        });
    }
};

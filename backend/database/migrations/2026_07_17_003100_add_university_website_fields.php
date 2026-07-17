<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// University website content fields (ADR-0005).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->string('slug', 190)->nullable()->unique()->after('code');
            $table->string('logo_path', 500)->nullable()->after('website');
            $table->string('cover_path', 500)->nullable()->after('logo_path');
            $table->string('address', 255)->nullable()->after('city');
            $table->boolean('moe_listed')->default(false)->after('status');
            $table->string('nearest_airport', 150)->nullable()->after('address');
            $table->text('about')->nullable()->after('nearest_airport');
            $table->string('apply_link', 255)->nullable()->after('website');
            $table->json('requirements')->nullable();
            $table->json('representative_professor')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('universities', function (Blueprint $table) {
            $table->dropColumn([
                'slug', 'logo_path', 'cover_path', 'address', 'moe_listed',
                'nearest_airport', 'about', 'apply_link', 'requirements', 'representative_professor',
            ]);
        });
    }
};

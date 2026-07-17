<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Portal credentials for the agent/student guards (ADR-0004).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->string('password')->nullable()->after('phone');
            $table->timestamp('last_login_at')->nullable()->after('status');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->string('password')->nullable()->after('phone');
            $table->timestamp('last_login_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropColumn(['password', 'last_login_at']);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['password', 'last_login_at']);
        });
    }
};

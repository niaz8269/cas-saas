<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * When an admin switches an account between Student and Partner, the old record is kept (never deleted)
 * and points at the new one, so history stays traceable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->unsignedBigInteger('converted_agent_id')->nullable()->after('agent_id');
            $table->timestamp('converted_at')->nullable()->after('converted_agent_id');
        });
        Schema::table('agents', function (Blueprint $table) {
            $table->unsignedBigInteger('converted_student_id')->nullable()->after('parent_agent_id');
            $table->timestamp('converted_at')->nullable()->after('converted_student_id');
        });
    }

    public function down(): void
    {
        Schema::table('students', fn (Blueprint $t) => $t->dropColumn(['converted_agent_id', 'converted_at']));
        Schema::table('agents', fn (Blueprint $t) => $t->dropColumn(['converted_student_id', 'converted_at']));
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('email', 190);
            $table->string('phone', 30)->nullable();
            $table->string('password');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('department_id')->nullable();
            $table->string('status', 20)->default('active');
            $table->string('two_fa_secret')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('email', 'uq_users_email');
            $table->index('branch_id', 'idx_users_branch');
            $table->index('department_id', 'idx_users_dept');
            $table->foreign('branch_id', 'fk_users_branch')->references('id')->on('branches');
            $table->foreign('department_id', 'fk_users_dept')->references('id')->on('departments');
        });

        // Framework infrastructure (not part of schema.sql's business tables).
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email', 190)->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};

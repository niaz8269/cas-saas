<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RBAC tables per schema.sql, spatie/laravel-permission compatible.
 * Pivot is `role_permissions` (schema.sql naming, mapped in config/permission.php)
 * and `model_has_permissions` is the ADR-0003 addendum.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('guard_name', 50)->default('web');
            $table->timestamps();

            $table->unique(['name', 'guard_name'], 'uq_roles_name_guard');
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('guard_name', 50)->default('web');
            $table->timestamps();

            $table->unique(['name', 'guard_name'], 'uq_permissions_name_guard');
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('permission_id');
            $table->unsignedBigInteger('role_id');

            $table->primary(['permission_id', 'role_id']);
            $table->foreign('permission_id', 'fk_rp_perm')->references('id')->on('permissions')->cascadeOnDelete();
            $table->foreign('role_id', 'fk_rp_role')->references('id')->on('roles')->cascadeOnDelete();
        });

        Schema::create('model_has_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('role_id');
            $table->string('model_type', 150);
            $table->unsignedBigInteger('model_id');

            $table->primary(['role_id', 'model_id', 'model_type']);
            $table->index(['model_id', 'model_type'], 'idx_mhr_model');
            $table->foreign('role_id', 'fk_mhr_role')->references('id')->on('roles')->cascadeOnDelete();
        });

        Schema::create('model_has_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('permission_id');
            $table->string('model_type', 150);
            $table->unsignedBigInteger('model_id');

            $table->primary(['permission_id', 'model_id', 'model_type']);
            $table->index(['model_id', 'model_type'], 'idx_mhp_model');
            $table->foreign('permission_id', 'fk_mhp_perm')->references('id')->on('permissions')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};

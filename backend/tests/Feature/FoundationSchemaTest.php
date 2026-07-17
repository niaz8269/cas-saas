<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('creates every foundation table from schema.sql', function () {
    $tables = [
        'countries',
        'branches',
        'departments',
        'users',
        'roles',
        'permissions',
        'role_permissions',       // schema.sql naming (ADR-0003)
        'model_has_roles',
        'model_has_permissions',  // ADR-0003 addendum
        'settings',
        'api_sources',
        'api_keys',
    ];

    foreach ($tables as $table) {
        expect(Schema::hasTable($table))->toBeTrue("missing table: {$table}");
    }
});

it('shapes the users table per schema.sql', function () {
    expect(Schema::hasColumns('users', [
        'id', 'name', 'email', 'phone', 'password', 'branch_id', 'department_id',
        'status', 'two_fa_secret', 'last_login_at',
        'created_at', 'updated_at', 'deleted_at',
    ]))->toBeTrue();

    // Columns intentionally absent (schema.sql contract, not Laravel defaults).
    expect(Schema::hasColumn('users', 'email_verified_at'))->toBeFalse();
    expect(Schema::hasColumn('users', 'remember_token'))->toBeFalse();
});

it('maps spatie to the role_permissions pivot', function () {
    expect(config('permission.table_names.role_has_permissions'))->toBe('role_permissions');
});

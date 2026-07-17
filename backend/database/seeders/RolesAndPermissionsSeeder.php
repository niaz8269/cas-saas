<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Baseline RBAC per Technical Report §8.1 (record scopes) and §8.2
 * (module × role matrix). Permission convention: module.action.scope
 * (e.g. leads.view.assigned). Each module milestone (M2–M9) refines its
 * own slice; the full per-action CRUD matrix lands with the Phase 7 spec.
 *
 * Super Admin holds no explicit permissions — it bypasses checks via
 * Gate::before (AppServiceProvider).
 */
class RolesAndPermissionsSeeder extends Seeder
{
    private const GUARD = 'staff';

    /**
     * role => permissions (module.action.scope)
     *
     * @var array<string, list<string>>
     */
    private const MATRIX = [
        'Management' => [
            'dashboard.view.global',
            'leads.view.global',
            'students.view.global',
            'applications.view.global',
            'universities.view.global',
            'scholarships.view.global',
            'documents.view.global',
            'finance.view.global',
            'commission.view.global',
            'visa.view.global',
            'reports.view.global',
        ],
        'Admin' => [ // Admin / Operations — full on every module (§8.2)
            'dashboard.view.global',
            'leads.view.global', 'leads.create.global', 'leads.update.global',
            'leads.delete.global', 'leads.assign.global', 'leads.convert.assigned',
            'students.view.global', 'students.create.global', 'students.update.global', 'students.delete.global',
            'applications.view.global', 'applications.create.global', 'applications.update.global', 'applications.delete.global',
            'universities.view.global', 'universities.manage.global',
            'scholarships.view.global', 'scholarships.manage.global',
            'documents.view.global', 'documents.upload.global', 'documents.verify.global', 'documents.delete.global',
            'finance.view.global', 'finance.manage.global',
            'commission.view.global', 'commission.manage.global',
            'visa.view.global', 'visa.manage.global',
            'reports.view.global',
            'users.manage.global',
            'settings.manage.global',
        ],
        'Counselor' => [
            'dashboard.view.assigned',
            'leads.view.assigned', 'leads.update.assigned', 'leads.convert.assigned',
            'students.view.assigned', 'students.update.assigned',
            'applications.view.assigned',
            'universities.view.global',
            'scholarships.view.global',
            'documents.view.assigned', 'documents.upload.assigned',
            'commission.view.own',
            'visa.view.global',
            'reports.view.own',
        ],
        'Admissions' => [
            'dashboard.view.global',
            'leads.view.global',
            'students.view.global', 'students.create.global', 'students.update.global',
            'applications.view.global', 'applications.create.global', 'applications.update.global',
            'universities.view.global', 'universities.manage.global',
            'scholarships.view.global', 'scholarships.manage.global',
            'documents.view.global', 'documents.upload.global', 'documents.verify.global',
            'finance.view.global',
            'commission.view.global',
            'visa.view.global',
            'reports.view.own',
        ],
        'Finance' => [
            'dashboard.view.global',
            'students.view.global',
            'applications.view.global',
            'documents.view.global',
            'finance.view.global', 'finance.manage.global',
            'commission.view.global', 'commission.manage.global',
            'visa.view.global',
            'reports.view.own',
        ],
        'Visa' => [
            'dashboard.view.global',
            'students.view.global',
            'applications.view.global',
            'documents.view.global', 'documents.upload.global', 'documents.verify.global',
            'visa.view.global', 'visa.manage.global',
            'reports.view.own',
        ],
        'Marketing' => [
            'dashboard.view.department',
            'leads.view.global', 'leads.create.global',
            'reports.view.own',
        ],
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Every permission mentioned anywhere in the matrix.
        $permissions = collect(self::MATRIX)->flatten()->unique()->sort()->values();

        foreach ($permissions as $name) {
            Permission::findOrCreate($name, self::GUARD);
        }

        Role::findOrCreate('Super Admin', self::GUARD);

        foreach (self::MATRIX as $roleName => $rolePermissions) {
            Role::findOrCreate($roleName, self::GUARD)
                ->syncPermissions($rolePermissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}

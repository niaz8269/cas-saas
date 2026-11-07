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

    /** Roles folded into Admin. */
    private const RETIRED = ['Management', 'Admissions', 'Marketing'];

    /**
     * role => permissions (module.action.scope)
     *
     * @var array<string, list<string>>
     */
    private const MATRIX = [
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
            'agents.view.global', 'agents.manage.global',
            'content.view.global', 'content.manage.global',
            'marketing.view.global', 'marketing.manage.global',
            'settings.manage.global',
        ],
        'Counselor' => [
            'dashboard.view.assigned',
            'leads.view.assigned', 'leads.create.assigned', 'leads.update.assigned', 'leads.convert.assigned',
            'students.view.assigned', 'students.update.assigned',
            // Counselors drive their own caseload's applications (create + advance
            // + record the offer response) — scoped to their assigned students.
            'applications.view.assigned', 'applications.create.assigned', 'applications.update.assigned',
            'universities.view.global',
            'scholarships.view.global',
            'documents.view.assigned', 'documents.upload.assigned',
            'commission.view.own',
            'visa.view.global',
            'reports.view.own',
        ],
        'Finance' => [
            'dashboard.view.global',
            'students.view.global',
            'applications.view.global',
            'documents.view.global',
            // Read the catalog so invoices/commissions can reference programs.
            'universities.view.global', 'scholarships.view.global',
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
            'universities.view.global', 'scholarships.view.global',
            'visa.view.global', 'visa.manage.global',
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

        $this->retireOldRoles();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * The team runs on five roles. Management, Admissions and Marketing were
     * folded into Admin (which already holds everything they could do): anyone
     * who still has one of them becomes an Admin, then the role is removed.
     * Idempotent: once they are gone this does nothing.
     */
    private function retireOldRoles(): void
    {
        foreach (self::RETIRED as $name) {
            $old = Role::where('name', $name)->where('guard_name', self::GUARD)->first();

            if (! $old) {
                continue;
            }

            foreach ($old->users()->get() as $user) {
                $user->assignRole('Admin');
            }

            $old->delete();
        }
    }
}

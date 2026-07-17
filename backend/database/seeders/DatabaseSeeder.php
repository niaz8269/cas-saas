<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            CountrySeeder::class,
            DepartmentSeeder::class,
            BranchSeeder::class,
            RolesAndPermissionsSeeder::class,
            StaffUserSeeder::class,
            CatalogSeeder::class,
            CrmSeeder::class,
            AdmissionsSeeder::class,
            FinanceSeeder::class,
            VisaSeeder::class,
            PortalSeeder::class,
            AutomationRuleSeeder::class,
        ]);
    }
}

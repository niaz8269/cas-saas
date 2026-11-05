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
            SettingSeeder::class,
            DepartmentSeeder::class,
            BranchSeeder::class,
            RolesAndPermissionsSeeder::class,
            StaffUserSeeder::class,
            VerifiedCatalogSeeder::class,
            SasCatalogSeeder::class,
            UniversityLocationSeeder::class,
            WikipediaProfileSeeder::class,
            OverviewSeeder::class,
            MoeMbbsSeeder::class,
            MbbsProgramGapSeeder::class,
            OfficialProgramGapSeeder::class,
            WikidataFactsSeeder::class,
            OfficialAddressSeeder::class,
            UniversityScholarshipSeeder::class,
            UniversityContactFixSeeder::class,
            GovernmentScholarshipSeeder::class,
            OfficialIntakeDatesSeeder::class,
            AdditionalUniversitiesSeeder::class,
            DocumentTypeSeeder::class,
            MajorSeeder::class,
            AutomationRuleSeeder::class,
            UniversityEmblemSeeder::class,
            MirrorPhotosSeeder::class,
            CampusPhotoSeeder::class,
            NewsSeeder::class,
        ]);
    }
}

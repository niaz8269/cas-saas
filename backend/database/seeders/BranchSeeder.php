<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Country;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        $china = Country::where('iso2', 'CN')->first();
        $pakistan = Country::where('iso2', 'PK')->first();

        Branch::updateOrCreate(['code' => 'HQ'], [
            'name' => 'Head Office',
            'country_id' => $china?->id,
            'city' => 'Beijing',
            'is_active' => true,
        ]);

        Branch::updateOrCreate(['code' => 'ISB'], [
            'name' => 'Islamabad Office',
            'country_id' => $pakistan?->id,
            'city' => 'Islamabad',
            'is_active' => true,
        ]);
    }
}

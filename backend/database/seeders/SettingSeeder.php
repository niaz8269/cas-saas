<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

/**
 * Configurable values Finance and Operations own. Seeded with the agreed
 * defaults; `updateOrCreate` on the key would overwrite a change made in the
 * admin, so existing rows are left alone.
 */
class SettingSeeder extends Seeder
{
    public function run(): void
    {
        Setting::firstOrCreate(
            ['key' => 'finance.processing_fee'],
            [
                'group' => 'finance',
                // One-time, non-refundable, charged once per student on their
                // first funded (scholarship/partial) application.
                'value' => ['amount' => 100, 'currency' => 'USD'],
            ],
        );
    }
}

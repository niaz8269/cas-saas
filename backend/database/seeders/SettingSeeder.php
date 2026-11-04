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
                // One-time, non-refundable, charged once per student: 500 CNY for
                // scholarship applications, 1,000 CNY for self-funded programs.
                'value' => [
                    'scholarship' => ['amount' => 500, 'currency' => 'CNY'],
                    'self' => ['amount' => 1000, 'currency' => 'CNY'],
                ],
            ],
        );
    }
}

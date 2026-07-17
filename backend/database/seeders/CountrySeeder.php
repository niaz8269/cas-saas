<?php

namespace Database\Seeders;

use App\Models\Country;
use Illuminate\Database\Seeder;

class CountrySeeder extends Seeder
{
    /**
     * Destination country plus CAS's common recruitment markets.
     */
    private const COUNTRIES = [
        ['China', 'CN', '+86'],
        ['Pakistan', 'PK', '+92'],
        ['Bangladesh', 'BD', '+880'],
        ['India', 'IN', '+91'],
        ['Nigeria', 'NG', '+234'],
        ['Ghana', 'GH', '+233'],
        ['Kazakhstan', 'KZ', '+7'],
        ['Uzbekistan', 'UZ', '+998'],
        ['Russia', 'RU', '+7'],
        ['Indonesia', 'ID', '+62'],
        ['Nepal', 'NP', '+977'],
        ['Sri Lanka', 'LK', '+94'],
        ['Egypt', 'EG', '+20'],
        ['Morocco', 'MA', '+212'],
        ['South Africa', 'ZA', '+27'],
        ['Kenya', 'KE', '+254'],
        ['Tanzania', 'TZ', '+255'],
        ['Saudi Arabia', 'SA', '+966'],
        ['United Arab Emirates', 'AE', '+971'],
        ['Turkey', 'TR', '+90'],
        ['United States', 'US', '+1'],
        ['United Kingdom', 'GB', '+44'],
        ['Canada', 'CA', '+1'],
    ];

    public function run(): void
    {
        foreach (self::COUNTRIES as [$name, $iso2, $phoneCode]) {
            Country::updateOrCreate(
                ['iso2' => $iso2],
                ['name' => $name, 'phone_code' => $phoneCode],
            );
        }
    }
}

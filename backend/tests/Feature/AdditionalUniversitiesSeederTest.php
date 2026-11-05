<?php

use App\Models\University;
use Database\Seeders\AdditionalUniversitiesSeeder;
use Database\Seeders\CountrySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('adds universities that publish international admissions but are not on the CSC list', function () {
    $this->seed(CountrySeeder::class);

    $this->seed(AdditionalUniversitiesSeeder::class);
    $this->seed(AdditionalUniversitiesSeeder::class);

    $yanan = University::where('name', "Yan'an University")->firstOrFail();
    expect($yanan->province)->toBe('Shaanxi')
        ->and(University::where('name', 'Shenyang Medical College')->count())->toBe(1)
        ->and($yanan->programs()->count())->toBe(1);
});

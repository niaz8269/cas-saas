<?php

use App\Models\Country;
use App\Support\CountryList;
use Database\Seeders\CountrySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

it('lists every country in the world except Israel and uninhabited territories', function () {
    // The migration has already run on the test database.
    $codes = Country::pluck('iso2')->all();

    expect(count($codes))->toBeGreaterThanOrEqual(240)
        ->and($codes)->not->toContain('IL')
        ->and($codes)->not->toContain('AQ')
        ->and($codes)->toContain('PK', 'CN', 'VN', 'TH', 'KG', 'KR', 'KP', 'IR', 'SY', 'PS', 'TW', 'HK', 'VA', 'XK', 'FJ', 'IS', 'NZ', 'AR', 'ZW', 'ET');

    // A few that a short list tends to lack, with the names people expect.
    expect(Country::where('iso2', 'VN')->value('name'))->toBe('Vietnam')
        ->and(Country::where('iso2', 'KG')->value('name'))->toBe('Kyrgyzstan');
});

it('keeps the names and codes of the countries that were already there', function () {
    Country::where('iso2', 'CN')->update(['name' => 'China', 'phone_code' => '+86']);

    CountrySeeder::addRemaining();

    expect(Country::where('iso2', 'CN')->value('name'))->toBe('China')
        ->and(Country::where('iso2', 'CN')->value('phone_code'))->toBe('+86')
        ->and(CountrySeeder::addRemaining())->toBe(0)
        ->and(Country::count())->toBe(count(CountryList::selectable()));
});

it('serves the full list, in name order, to the agent sign-up form', function () {
    $names = collect(getJson('/api/v1/public/countries')->assertOk()->json('data'))->pluck('name');

    expect($names->count())->toBeGreaterThanOrEqual(240)
        ->and($names->all())->toBe(Country::orderBy('name')->pluck('name')->all())
        ->and($names)->not->toContain('Israel');
});

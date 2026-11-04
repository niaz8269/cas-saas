<?php

use App\Models\University;
use Database\Seeders\OfficialAddressSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('fills a missing address from the official website without overwriting', function () {
    $addresses = json_decode(file_get_contents(database_path('data/official_addresses.json')), true)['universities'];
    $slug = array_key_first($addresses);

    $u = University::factory()->create(['slug' => $slug, 'address' => null]);
    $this->seed(OfficialAddressSeeder::class);
    expect($u->refresh()->address)->toBe($addresses[$slug]);

    $u->update(['address' => 'Kept Road 1']);
    $this->seed(OfficialAddressSeeder::class);
    expect($u->refresh()->address)->toBe('Kept Road 1');
});

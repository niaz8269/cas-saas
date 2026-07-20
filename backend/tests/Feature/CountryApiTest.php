<?php

use App\Models\Country;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lists countries for any authenticated staff member', function () {
    actingAsStaffWith([]);
    Country::factory()->count(3)->create();

    $this->getJson('/api/v1/countries')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name', 'iso2']]])
        ->assertJsonCount(3, 'data');
});

it('requires authentication to list countries', function () {
    $this->getJson('/api/v1/countries')->assertStatus(401);
});

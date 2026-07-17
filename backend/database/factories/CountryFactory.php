<?php

namespace Database\Factories;

use App\Models\Country;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Country>
 */
class CountryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->country(),
            'iso2' => fake()->unique()->countryCode(),
            'phone_code' => '+'.fake()->numberBetween(1, 998),
        ];
    }
}

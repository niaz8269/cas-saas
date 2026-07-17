<?php

namespace Database\Factories;

use App\Models\Country;
use App\Models\University;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<University>
 */
class UniversityFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->company().' University',
            'code' => strtoupper(fake()->unique()->lexify('UNI???')),
            'country_id' => Country::factory(),
            'city' => fake()->city(),
            'website' => fake()->domainName(),
            'status' => 'active',
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['status' => 'inactive']);
    }
}

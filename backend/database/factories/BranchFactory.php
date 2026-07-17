<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Country;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Branch>
 */
class BranchFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->city().' Office',
            'code' => strtoupper(fake()->unique()->lexify('BR???')),
            'country_id' => Country::factory(),
            'city' => fake()->city(),
            'is_active' => true,
        ];
    }
}

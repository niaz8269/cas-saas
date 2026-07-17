<?php

namespace Database\Factories;

use App\Models\Country;
use App\Models\Lead;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lead>
 */
class LeadFactory extends Factory
{
    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->unique()->e164PhoneNumber(),
            'passport_no' => null,
            'country_id' => Country::factory(),
            'intake_route' => fake()->randomElement(['info', 'full']),
            'status' => 'new',
            'message' => fake()->sentence(10),
            'meta' => null,
        ];
    }

    public function assigned(): static
    {
        return $this->state(fn () => ['status' => 'assigned']);
    }
}

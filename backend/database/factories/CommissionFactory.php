<?php

namespace Database\Factories;

use App\Models\Application;
use App\Models\Commission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Commission>
 */
class CommissionFactory extends Factory
{
    public function definition(): array
    {
        $application = Application::factory();

        return [
            'application_id' => $application,
            'university_id' => fn (array $attributes) => Application::find($attributes['application_id'])->university_id,
            'currency' => 'CNY',
            'expected_amount' => fake()->numberBetween(3000, 12000),
            'status' => 'expected',
        ];
    }
}

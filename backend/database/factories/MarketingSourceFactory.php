<?php

namespace Database\Factories;

use App\Models\MarketingSource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MarketingSource>
 */
class MarketingSourceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'channel' => fake()->randomElement(['organic', 'paid', 'referral', 'social']),
            'is_active' => true,
        ];
    }
}

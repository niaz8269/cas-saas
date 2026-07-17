<?php

namespace Database\Factories;

use App\Models\ApiSource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApiSource>
 */
class ApiSourceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->domainWord().' website',
            'type' => 'website',
            'website_url' => 'https://'.fake()->domainName(),
            'is_active' => true,
        ];
    }
}

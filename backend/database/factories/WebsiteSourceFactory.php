<?php

namespace Database\Factories;

use App\Models\ApiSource;
use App\Models\WebsiteSource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WebsiteSource>
 */
class WebsiteSourceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'api_source_id' => ApiSource::factory(),
            'domain' => fake()->unique()->domainName(),
            'university_focus' => fake()->company().' University',
            'is_active' => true,
        ];
    }
}

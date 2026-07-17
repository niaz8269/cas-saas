<?php

namespace Database\Factories;

use App\Models\Campaign;
use App\Models\MarketingSource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Campaign>
 */
class CampaignFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true).' Campaign',
            'marketing_source_id' => MarketingSource::factory(),
            'utm_source' => fake()->randomElement(['google', 'facebook', 'tiktok']),
            'utm_medium' => 'cpc',
            'utm_campaign' => fake()->slug(3),
            'start_date' => now()->subMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(),
        ];
    }
}

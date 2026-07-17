<?php

namespace Database\Factories;

use App\Models\Application;
use App\Models\Offer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Offer>
 */
class OfferFactory extends Factory
{
    public function definition(): array
    {
        return [
            'application_id' => Application::factory(),
            'offer_type' => fake()->randomElement(['conditional', 'unconditional']),
            'reference_no' => strtoupper(fake()->bothify('OFR-####-????')),
            'issued_date' => now()->subDays(fake()->numberBetween(1, 30))->toDateString(),
            'expiry_date' => now()->addDays(fake()->numberBetween(30, 90))->toDateString(),
            'status' => 'issued',
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\University;
use App\Models\UniversityAgreement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UniversityAgreement>
 */
class UniversityAgreementFactory extends Factory
{
    public function definition(): array
    {
        $type = fake()->randomElement(['fixed', 'percent']);

        return [
            'university_id' => University::factory(),
            'program_id' => null,
            'commission_type' => $type,
            'commission_value' => $type === 'percent'
                ? fake()->numberBetween(5, 20)
                : fake()->numberBetween(3000, 12000),
            'currency' => $type === 'fixed' ? 'CNY' : null,
            'eligibility_trigger' => 'arrival_first_year_paid',
            'valid_from' => now()->subMonths(6)->toDateString(),
            'valid_to' => now()->addMonths(18)->toDateString(),
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\Intake;
use App\Models\University;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Intake>
 */
class IntakeFactory extends Factory
{
    public function definition(): array
    {
        $start = fake()->dateTimeBetween('+2 months', '+10 months');

        return [
            'university_id' => University::factory(),
            'program_id' => null,
            'name' => $start->format('F Y'),
            'start_date' => $start->format('Y-m-d'),
            'application_deadline' => fake()->dateTimeBetween('now', $start)->format('Y-m-d'),
            'seats' => fake()->numberBetween(20, 200),
            'status' => 'open',
        ];
    }
}

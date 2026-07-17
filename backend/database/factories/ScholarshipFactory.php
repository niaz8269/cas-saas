<?php

namespace Database\Factories;

use App\Models\Scholarship;
use App\Models\University;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Scholarship>
 */
class ScholarshipFactory extends Factory
{
    public function definition(): array
    {
        return [
            'university_id' => University::factory(),
            'name' => fake()->randomElement([
                'Presidential Scholarship', 'Belt & Road Scholarship',
                'Provincial Government Scholarship', 'First-Year Merit Award',
            ]),
            'type' => fake()->randomElement(['full', 'partial', 'merit']),
            'coverage' => fake()->randomElement(['Full tuition', 'Tuition + hostel', '50% tuition']),
            'criteria' => ['min_gpa' => 3.0],
            'deadline' => fake()->dateTimeBetween('+1 month', '+8 months')->format('Y-m-d'),
            'status' => 'active',
        ];
    }
}

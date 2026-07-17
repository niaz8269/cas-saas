<?php

namespace Database\Factories;

use App\Models\University;
use App\Models\UniversityContact;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UniversityContact>
 */
class UniversityContactFactory extends Factory
{
    public function definition(): array
    {
        return [
            'university_id' => University::factory(),
            'name' => fake()->name(),
            'email' => fake()->unique()->companyEmail(),
            'phone' => fake()->e164PhoneNumber(),
            'role' => fake()->randomElement(['Admissions Officer', 'International Office', 'Dean Assistant']),
        ];
    }
}

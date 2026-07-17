<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\University;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'university_id' => University::factory(),
            'name' => fake()->randomElement([
                'MBBS', 'BDS', 'Civil Engineering', 'Computer Science and Technology',
                'International Business', 'Chinese Language Program',
            ]),
            'level' => fake()->randomElement(['bachelor', 'master', 'phd']),
            'duration_months' => fake()->randomElement([12, 36, 48, 60, 72]),
            'tuition_fee' => fake()->numberBetween(15000, 45000),
            'currency' => 'CNY',
            'requirements' => ['min_age' => 18, 'documents' => ['passport', 'transcript']],
            'status' => 'active',
        ];
    }
}

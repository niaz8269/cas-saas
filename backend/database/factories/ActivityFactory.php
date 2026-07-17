<?php

namespace Database\Factories;

use App\Models\Activity;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Activity>
 */
class ActivityFactory extends Factory
{
    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'user_id' => User::factory(),
            'type' => fake()->randomElement(['note', 'call', 'email', 'status', 'system']),
            'body' => fake()->sentence(12),
            'meta' => null,
            'created_at' => fake()->dateTimeBetween('-2 months'),
        ];
    }
}

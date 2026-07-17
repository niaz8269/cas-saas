<?php

namespace Database\Factories;

use App\Models\Student;
use App\Models\StudentGuardian;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StudentGuardian>
 */
class StudentGuardianFactory extends Factory
{
    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'name' => fake()->name(),
            'relation' => fake()->randomElement(['father', 'mother', 'uncle', 'sibling']),
            'phone' => fake()->e164PhoneNumber(),
            'email' => fake()->safeEmail(),
        ];
    }
}

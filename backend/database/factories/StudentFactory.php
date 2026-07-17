<?php

namespace Database\Factories;

use App\Models\Country;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Student>
 */
class StudentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'student_code' => strtoupper(fake()->unique()->bothify('STU-2026-#####')),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->unique()->e164PhoneNumber(),
            'passport_no' => strtoupper(fake()->unique()->bothify('??#######')),
            'dob' => fake()->dateTimeBetween('-28 years', '-17 years')->format('Y-m-d'),
            'gender' => fake()->randomElement(['male', 'female']),
            'country_id' => Country::factory(),
            'status' => 'active',
        ];
    }
}

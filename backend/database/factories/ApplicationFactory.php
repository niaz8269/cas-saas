<?php

namespace Database\Factories;

use App\Models\Application;
use App\Models\Program;
use App\Models\Student;
use App\Models\University;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Application>
 */
class ApplicationFactory extends Factory
{
    public function definition(): array
    {
        $university = University::factory();

        return [
            'application_code' => strtoupper(fake()->unique()->bothify('APP-2026-#####')),
            'student_id' => Student::factory(),
            'university_id' => $university,
            'program_id' => Program::factory()->for($university, 'university'),
            'status' => 'draft',
        ];
    }

    public function forCatalog(University $university, Program $program): static
    {
        return $this->state(fn () => [
            'university_id' => $university->id,
            'program_id' => $program->id,
        ]);
    }
}

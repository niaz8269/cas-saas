<?php

namespace Database\Factories;

use App\Models\Student;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'description' => fake()->sentence(10),
            'assignee_id' => User::factory(),
            'student_id' => Student::factory(),
            'due_at' => fake()->dateTimeBetween('now', '+2 weeks'),
            'priority' => fake()->randomElement(['low', 'normal', 'high']),
            'status' => 'open',
        ];
    }
}

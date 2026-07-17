<?php

namespace Database\Factories;

use App\Models\Communication;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Communication>
 */
class CommunicationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'channel' => fake()->randomElement(['email', 'whatsapp', 'sms', 'in_app']),
            'direction' => 'out',
            'template' => fake()->randomElement(['offer_received', 'visa_approved', 'payment_reminder']),
            'body' => fake()->sentence(12),
            'status' => 'queued',
            'created_at' => now(),
        ];
    }
}

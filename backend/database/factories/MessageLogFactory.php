<?php

namespace Database\Factories;

use App\Models\Communication;
use App\Models\MessageLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MessageLog>
 */
class MessageLogFactory extends Factory
{
    public function definition(): array
    {
        return [
            'communication_id' => Communication::factory(),
            'provider' => fake()->randomElement(['mailpit', 'whatsapp_cloud', 'twilio']),
            'provider_msg_id' => fake()->uuid(),
            'status' => 'sent',
            'error' => null,
            'created_at' => now(),
        ];
    }
}

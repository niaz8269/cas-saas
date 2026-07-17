<?php

namespace Database\Factories;

use App\Models\Agent;
use App\Models\AgentAgreement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AgentAgreement>
 */
class AgentAgreementFactory extends Factory
{
    public function definition(): array
    {
        return [
            'agent_id' => Agent::factory(),
            'share_type' => 'percent',
            'share_value' => fake()->numberBetween(20, 60),
            'applies_to' => null,
            'valid_from' => now()->subMonths(3)->toDateString(),
            'valid_to' => now()->addYear()->toDateString(),
        ];
    }
}

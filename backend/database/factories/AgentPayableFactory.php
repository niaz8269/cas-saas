<?php

namespace Database\Factories;

use App\Models\Agent;
use App\Models\AgentPayable;
use App\Models\Commission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AgentPayable>
 */
class AgentPayableFactory extends Factory
{
    public function definition(): array
    {
        return [
            'commission_id' => Commission::factory(),
            'agent_id' => Agent::factory(),
            'amount' => fake()->numberBetween(1000, 6000),
            'currency' => 'CNY',
            'status' => 'payable',
            'computed_at' => now(),
        ];
    }
}

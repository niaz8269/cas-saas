<?php

namespace Database\Factories;

use App\Models\Agent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Agent>
 */
class AgentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'agent_code' => strtoupper(fake()->unique()->bothify('AGT-####')),
            'name' => fake()->company(),
            'type' => 'partner',
            'parent_agent_id' => null,
            'email' => fake()->unique()->companyEmail(),
            'phone' => fake()->e164PhoneNumber(),
            'status' => 'active',
        ];
    }

    public function subAgentOf(Agent $parent): static
    {
        return $this->state(fn () => [
            'type' => $parent->type === 'partner' ? 'sub' : 'sub_sub',
            'parent_agent_id' => $parent->id,
        ]);
    }
}

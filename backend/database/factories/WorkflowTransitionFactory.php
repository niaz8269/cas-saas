<?php

namespace Database\Factories;

use App\Models\WorkflowTransition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkflowTransition>
 */
class WorkflowTransitionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'entity_type' => 'application',
            'entity_id' => fake()->numberBetween(1, 50),
            'from_state' => 'under_review',
            'to_state' => 'submitted',
            'actor_id' => null,
            'created_at' => now(),
        ];
    }
}

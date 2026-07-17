<?php

namespace Database\Factories;

use App\Models\WorkflowDefinition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkflowDefinition>
 */
class WorkflowDefinitionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Application lifecycle',
            'entity_type' => 'application',
            'states' => ['draft', 'under_review', 'submitted', 'offer_received', 'accepted'],
            'transitions' => [
                ['from' => 'draft', 'to' => 'under_review', 'owner_role' => 'Admissions'],
                ['from' => 'submitted', 'to' => 'offer_received', 'owner_role' => 'Admissions'],
            ],
            'sla' => ['under_review' => 48, 'submitted' => 72],
            'is_active' => true,
        ];
    }
}

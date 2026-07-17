<?php

namespace Database\Factories;

use App\Models\AutomationRule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AutomationRule>
 */
class AutomationRuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Notify counselor on offer',
            'trigger_def' => ['event' => 'application.status', 'to' => 'offer_received'],
            'conditions' => [],
            'actions' => [['type' => 'notify', 'target' => 'counselor']],
            'is_active' => true,
        ];
    }
}

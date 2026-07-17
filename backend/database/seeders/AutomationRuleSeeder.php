<?php

namespace Database\Seeders;

use App\Models\AutomationRule;
use Illuminate\Database\Seeder;

/**
 * Seeds a couple of demonstrable automations. Runs LAST so the demo
 * pipeline (which walks applications/visa through the workflow) does not
 * fire these during seeding — only real, post-seed transitions do.
 */
class AutomationRuleSeeder extends Seeder
{
    public function run(): void
    {
        $rules = [
            [
                'name' => 'Email the student when an offer arrives',
                'trigger_def' => ['event' => 'application.status', 'to' => 'offer_received'],
                'conditions' => [],
                'actions' => [[
                    'type' => 'communication', 'channel' => 'email',
                    'template' => 'offer_received', 'target' => 'student',
                ]],
            ],
            [
                'name' => 'Email the student when their visa is approved',
                'trigger_def' => ['event' => 'visa.status', 'to' => 'approved'],
                'conditions' => [],
                'actions' => [[
                    'type' => 'communication', 'channel' => 'email',
                    'template' => 'visa_approved', 'target' => 'student',
                ]],
            ],
        ];

        foreach ($rules as $rule) {
            AutomationRule::firstOrCreate(['name' => $rule['name']], [
                ...$rule,
                'is_active' => true,
            ]);
        }
    }
}

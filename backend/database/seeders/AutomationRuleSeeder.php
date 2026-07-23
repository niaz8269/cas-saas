<?php

namespace Database\Seeders;

use App\Models\AutomationRule;
use Illuminate\Database\Seeder;

/**
 * Seeds the student-facing lifecycle emails: every milestone that needs
 * to reach the applicant (offer, acceptance, submission, rejection,
 * documents requested / rejected / verified, visa approved / rejected).
 * Runs LAST so the demo pipeline (which walks applications/visa through
 * the workflow) does not fire these during seeding — only real, post-seed
 * transitions do. Rules are pure data; edit or disable them at runtime.
 */
class AutomationRuleSeeder extends Seeder
{
    public function run(): void
    {
        $rules = [
            [
                'name' => 'Email the student when an offer arrives',
                'trigger_def' => ['event' => 'application.status', 'to' => 'offer_received'],
                'template' => 'offer_received',
            ],
            [
                'name' => 'Email the student when their offer is accepted',
                'trigger_def' => ['event' => 'application.status', 'to' => 'accepted'],
                'template' => 'offer_accepted',
            ],
            [
                'name' => 'Email the student when their application is submitted to the university',
                'trigger_def' => ['event' => 'application.status', 'to' => 'submitted'],
                'template' => 'application_submitted',
            ],
            [
                'name' => 'Email the student when their application is not successful',
                'trigger_def' => ['event' => 'application.status', 'to' => 'rejected'],
                'template' => 'application_rejected',
            ],
            [
                'name' => 'Email the student when documents are requested',
                'trigger_def' => ['event' => 'application.status', 'to' => 'documents_pending'],
                'template' => 'documents_requested',
            ],
            [
                'name' => 'Email the student when a document is rejected',
                'trigger_def' => ['event' => 'document.status', 'to' => 'rejected'],
                'template' => 'document_rejected',
            ],
            [
                'name' => 'Email the student when a document is verified',
                'trigger_def' => ['event' => 'document.status', 'to' => 'verified'],
                'template' => 'document_verified',
            ],
            [
                'name' => 'Email the student when their visa is approved',
                'trigger_def' => ['event' => 'visa.status', 'to' => 'approved'],
                'template' => 'visa_approved',
            ],
            [
                'name' => 'Email the student when their visa is not approved',
                'trigger_def' => ['event' => 'visa.status', 'to' => 'rejected'],
                'template' => 'visa_rejected',
            ],
        ];

        foreach ($rules as $rule) {
            AutomationRule::firstOrCreate(['name' => $rule['name']], [
                'trigger_def' => $rule['trigger_def'],
                'conditions' => [],
                'actions' => [[
                    'type' => 'communication',
                    'channel' => 'email',
                    'template' => $rule['template'],
                    'target' => 'student',
                ]],
                'is_active' => true,
            ]);
        }
    }
}

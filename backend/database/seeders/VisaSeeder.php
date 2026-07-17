<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\Commission;
use App\Models\User;
use App\Models\VisaCase;
use App\Services\Admissions\ApplicationWorkflow;
use App\Services\Visa\VisaWorkflow;
use Illuminate\Database\Seeder;

/**
 * Walks the accepted applications' visa cases through the REAL
 * VisaWorkflow to varied stages, matched to their commission state:
 * received commission → travel_ready, pending_arrival → approved,
 * fresh acceptance → documents_collection. Runs after FinanceSeeder.
 */
class VisaSeeder extends Seeder
{
    public function run(): void
    {
        if (VisaCase::where('status', '!=', 'not_started')->exists()) {
            return; // already seeded
        }

        $officer = User::where('email', 'visa@cas.moe')->first();
        $admissions = User::where('email', 'admissions@cas.moe')->first();

        if (! $officer || ! $admissions) {
            return;
        }

        $workflow = app(VisaWorkflow::class);

        // One more acceptance for pipeline depth — its case stays early.
        $offer = Application::where('status', 'offer_received')->first();

        if ($offer) {
            app(ApplicationWorkflow::class)->transition($offer, 'accepted', $admissions, 'Seeded acceptance');
        }

        // The acceptance hook opens cases; openCase() backfills any
        // application accepted before the hook existed (idempotent).
        foreach (Application::where('status', 'accepted')->get() as $application) {
            $case = $workflow->openCase($application, $officer);
            $case->update(['assigned_visa_officer_id' => $officer->id]);

            $target = match (Commission::where('application_id', $application->id)->value('status')) {
                'received' => 'travel_ready',
                'pending_arrival' => 'approved',
                default => 'documents_collection',
            };

            $this->walk($workflow, $case->refresh(), $officer, $target);
        }
    }

    private function walk(VisaWorkflow $workflow, VisaCase $case, User $actor, string $target): void
    {
        $ladder = ['documents_collection', 'appointment_booked', 'submitted', 'approved', 'travel_ready'];

        foreach ($ladder as $step) {
            if ($step === 'appointment_booked') {
                // Required documents collected before booking (also the
                // submission gate).
                $case->checklistItems()->where('is_required', true)->update(['status' => 'verified']);
            }

            $workflow->transition(
                $case->refresh(), $step, $actor, 'Seeded transition',
                $step === 'appointment_booked' ? ['appointment_at' => now()->addDays(10)] : [],
            );

            if ($step === $target) {
                break;
            }
        }

        // Partial progress realism on early-stage cases.
        if ($target === 'documents_collection') {
            $case->checklistItems()
                ->where('name', 'Passport (6+ months validity)')
                ->update(['status' => 'received']);
        }
    }
}

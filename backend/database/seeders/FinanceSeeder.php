<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\AgentPayable;
use App\Models\Application;
use App\Models\Commission;
use App\Models\Invoice;
use App\Models\User;
use App\Services\Admissions\ApplicationWorkflow;
use App\Services\Finance\CommissionEngine;
use App\Services\Finance\InvoiceService;
use Illuminate\Database\Seeder;

/**
 * Advances the seeded admissions pipeline through the REAL money flows:
 * tuition payment, arrival, and the full commission ladder to received —
 * producing authentic agent payables from the seeded hierarchy.
 */
class FinanceSeeder extends Seeder
{
    public function run(): void
    {
        if (AgentPayable::exists()) {
            return; // already seeded
        }

        $finance = User::where('email', 'finance@cas.moe')->first();
        $admissions = User::where('email', 'admissions@cas.moe')->first();
        $subAgent = Agent::where('agent_code', 'LEL-0002')->first();

        if (! $finance || ! $admissions) {
            return;
        }

        $engine = app(CommissionEngine::class);
        $invoices = app(InvoiceService::class);

        // ── 1. Walk the accepted application's commission to `received` ──
        $accepted = Application::where('status', 'accepted')->first();

        if ($accepted) {
            // Attribution: the record belongs to the seeded sub-agent so the
            // cascade produces partner + sub payables.
            $accepted->update(['agent_id' => $subAgent?->id]);
            $accepted->student->update(['agent_id' => $subAgent?->id, 'status' => 'arrived']);

            $commission = Commission::firstWhere('application_id', $accepted->id)
                ?? $engine->openExpected($accepted, $admissions);

            $tuition = Invoice::where('application_id', $accepted->id)
                ->where('party_type', 'student')
                ->first();

            if ($tuition && $tuition->status !== 'paid') {
                $remaining = (float) $tuition->total - (float) $tuition->amount_paid;
                $invoices->recordPayment($tuition, $remaining, $finance, 'bank_transfer', 'SEED-TUITION-FULL');
            }

            $engine->transition($commission->refresh(), 'pending_arrival', $finance, ['note' => 'Visa approved']);
            $engine->transition($commission->refresh(), 'eligible', $finance);
            $engine->transition($commission->refresh(), 'invoiced', $finance);
            $engine->transition($commission->refresh(), 'received', $finance, ['reference' => 'SEED-BANK-REF-001']);
        }

        // ── 2. Accept one offer_received application for pipeline depth ──
        $next = Application::where('status', 'offer_received')->first();

        if ($next) {
            app(ApplicationWorkflow::class)->transition($next, 'accepted', $admissions, 'Seeded acceptance');

            $commission = Commission::firstWhere('application_id', $next->id);

            if ($commission) {
                $engine->transition($commission, 'pending_arrival', $finance, ['note' => 'Awaiting enrollment']);
            }

            // Partial tuition payment for receivables realism.
            $tuition = Invoice::where('application_id', $next->id)
                ->where('party_type', 'student')
                ->first();

            if ($tuition) {
                $invoices->recordPayment($tuition, round((float) $tuition->total * 0.4, 2), $finance, 'bank_transfer', 'SEED-TUITION-40PCT');
            }
        }
    }
}

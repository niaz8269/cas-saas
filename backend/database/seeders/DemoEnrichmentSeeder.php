<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\Application;
use App\Models\Commission;
use App\Models\Invoice;
use App\Models\User;
use App\Services\Admissions\ApplicationWorkflow;
use App\Services\Finance\CommissionEngine;
use App\Services\Finance\InvoiceService;
use Illuminate\Database\Seeder;

/**
 * Deepens the demo so finance and admissions screens look production-like.
 * Everything flows through the real workflow/commission engine so history
 * chains, invoices, payables and visa cases stay authentic. Idempotent:
 * skips once the accepted pipeline has been enriched.
 */
class DemoEnrichmentSeeder extends Seeder
{
    public function run(): void
    {
        // Idempotent: the enrichment adds two acceptances (base pipeline = 3).
        if (Application::where('status', 'accepted')->count() >= 5) {
            return;
        }

        $finance = User::where('email', 'finance@cas.moe')->first();
        $admissions = User::where('email', 'admissions@cas.moe')->first();

        if (! $finance || ! $admissions) {
            return;
        }

        $workflow = app(ApplicationWorkflow::class);
        $engine = app(CommissionEngine::class);
        $invoices = app(InvoiceService::class);
        $partner = Agent::firstWhere('agent_code', 'GSP-0001');
        $sub = Agent::firstWhere('agent_code', 'LEL-0002');

        // Consistency: applications already accepted should show accepted offers.
        Application::where('status', 'accepted')->get()->each(
            fn (Application $app) => $app->offers()->where('status', 'issued')->update(['status' => 'accepted']),
        );

        $submitted = Application::where('status', 'submitted')
            ->with('student')
            ->orderBy('id')
            ->get();

        // 1. A fresh offer awaiting the applicant's decision (accept/decline demo).
        if ($app = $submitted->get(0)) {
            $this->issueOffer($app);
            $workflow->transition($app, 'offer_received', $admissions, 'Offer received');
        }

        // 2. Full money trail to `received` for the sub-agent — produces payables.
        if ($app = $submitted->get(1)) {
            $this->accept($app, $sub, $workflow, $admissions);
            $app->student?->update(['status' => 'arrived']);

            if ($tuition = $this->tuition($app)) {
                $invoices->recordPayment($tuition, (float) $tuition->total - (float) $tuition->amount_paid, $finance, 'bank_transfer', 'SEED-ENR-FULL');
            }

            if ($commission = Commission::firstWhere('application_id', $app->id)) {
                $engine->transition($commission->refresh(), 'pending_arrival', $finance, ['note' => 'Visa approved']);
                $engine->transition($commission->refresh(), 'eligible', $finance);
                $engine->transition($commission->refresh(), 'invoiced', $finance);
                $engine->transition($commission->refresh(), 'received', $finance, ['reference' => 'SEED-ENR-BANK']);
            }
        }

        // 3. Partial tuition, commission held at pending_arrival for the partner.
        if ($app = $submitted->get(2)) {
            $this->accept($app, $partner, $workflow, $admissions);

            if ($tuition = $this->tuition($app)) {
                $invoices->recordPayment($tuition, round((float) $tuition->total * 0.5, 2), $finance, 'bank_transfer', 'SEED-ENR-50PCT');
            }

            if ($commission = Commission::firstWhere('application_id', $app->id)) {
                $engine->transition($commission, 'pending_arrival', $finance, ['note' => 'Awaiting enrollment']);
            }
        }
    }

    private function accept(Application $app, ?Agent $agent, ApplicationWorkflow $workflow, User $actor): void
    {
        if ($agent) {
            $app->update(['agent_id' => $agent->id]);
            $app->student?->update(['agent_id' => $agent->id]);
        }

        $this->issueOffer($app);
        $workflow->transition($app, 'offer_received', $actor, 'Offer received');
        $workflow->transition($app, 'accepted', $actor, 'Offer accepted');
        $app->offers()->update(['status' => 'accepted']);
    }

    private function issueOffer(Application $app): void
    {
        if ($app->offers()->exists()) {
            return;
        }

        $app->offers()->create([
            'offer_type' => fake()->randomElement(['conditional', 'unconditional']),
            'reference_no' => strtoupper(fake()->bothify('OFR-2026-????')),
            'issued_date' => now()->subDays(fake()->numberBetween(2, 15))->toDateString(),
            'expiry_date' => now()->addDays(60)->toDateString(),
            'status' => 'issued',
        ]);
    }

    private function tuition(Application $app): ?Invoice
    {
        return Invoice::where('application_id', $app->id)
            ->where('party_type', 'student')
            ->first();
    }
}

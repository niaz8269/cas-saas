<?php

namespace App\Services\Finance;

use App\Models\Agent;
use App\Models\AgentPayable;
use App\Models\Application;
use App\Models\Commission;
use App\Models\CommissionStatusHistory;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Owns the commission lifecycle (report §5.6):
 * expected → pending_arrival → eligible → invoiced → received.
 *
 * Forecast (expected/eligible) is strictly separated from cash
 * (invoiced/received). Every transition is transactional and written to
 * the immutable commission_status_history. On `received`, agent shares
 * cascade down the partner → sub → sub-sub hierarchy: each agent's gross
 * share is computed against the received amount, and a child's gross is
 * carved out of its parent's payable.
 */
class CommissionEngine
{
    /** @var array<string, list<string>> */
    public const TRANSITIONS = [
        'expected' => ['pending_arrival'],
        'pending_arrival' => ['eligible'],
        'eligible' => ['invoiced'],
        'invoiced' => ['received'],
        'received' => [],
    ];

    public function __construct(
        private readonly AgreementResolver $agreements,
        private readonly InvoiceService $invoices,
    ) {}

    /**
     * Acceptance side-effects: first-year tuition invoice for the student
     * plus the expected commission. Called from ApplicationWorkflow.
     */
    public function onApplicationAccepted(Application $application, User $actor): Commission
    {
        $application->loadMissing(['course', 'student', 'university']);
        $course = $application->course;

        if ($course?->tuition_fee !== null) {
            $this->invoices->create(
                partyType: 'student',
                partyId: $application->student_id,
                applicationId: $application->id,
                currency: $course->currency ?? 'CNY',
                items: [[
                    'description' => "First-year tuition — {$course->name}, {$application->university->name}",
                    'unit_price' => (float) $course->tuition_fee,
                ]],
                actor: $actor,
            );
        }

        return $this->openExpected($application, $actor);
    }

    /**
     * Create the expected commission from the governing agreement.
     * Idempotent per application (unique constraint mirrors this).
     */
    public function openExpected(Application $application, User $actor): Commission
    {
        if ($existing = Commission::where('application_id', $application->id)->first()) {
            return $existing;
        }

        $agreement = $this->agreements->resolve($application);
        $application->loadMissing('course');

        [$amount, $currency] = match ($agreement?->commission_type) {
            'fixed' => [(float) $agreement->commission_value, $agreement->currency ?? 'CNY'],
            'percent' => [
                round((float) $application->course->tuition_fee * (float) $agreement->commission_value / 100, 2),
                $application->course->currency ?? 'CNY',
            ],
            // tiered structures arrive with the Phase-2 spec; track at zero
            'tiered' => [0.0, $agreement->currency ?? 'CNY'],
            default => [0.0, 'CNY'],
        };

        return DB::transaction(function () use ($application, $agreement, $amount, $currency, $actor) {
            $commission = Commission::create([
                'application_id' => $application->id,
                'university_id' => $application->university_id,
                'agreement_id' => $agreement?->id,
                'currency' => $currency,
                'expected_amount' => $amount,
                'status' => 'expected',
            ]);

            $this->writeHistory($commission, null, 'expected', $actor, $amount,
                $agreement ? null : 'No valid agreement found — expected amount set to 0');

            return $commission;
        });
    }

    /**
     * @param  array{amount?: float, method?: string, reference?: string, note?: string}  $options
     */
    public function transition(Commission $commission, string $to, User $actor, array $options = []): Commission
    {
        $from = $commission->status;

        if (! in_array($to, self::TRANSITIONS[$from] ?? [], true)) {
            throw new ConflictHttpException("Illegal commission transition: {$from} → {$to}.");
        }

        if ($to === 'eligible') {
            $this->guardEligibility($commission);
        }

        return DB::transaction(function () use ($commission, $from, $to, $actor, $options) {
            $reference = $options['reference'] ?? null;
            $amount = null;

            switch ($to) {
                case 'eligible':
                    $amount = $options['amount'] ?? (float) $commission->expected_amount;
                    $commission->forceFill([
                        'eligible_amount' => $amount,
                        'eligibility_confirmed_at' => now(),
                    ]);
                    break;

                case 'invoiced':
                    $invoice = $this->createUniversityInvoice($commission, $actor);
                    $amount = (float) $invoice->total;
                    $reference = $invoice->invoice_no;
                    $commission->forceFill(['invoiced_amount' => $amount]);
                    break;

                case 'received':
                    $amount = $options['amount'] ?? (float) $commission->invoiced_amount;
                    $invoice = $this->universityInvoice($commission);

                    if ($invoice) {
                        $payment = $this->invoices->recordPayment(
                            $invoice, $amount, $actor,
                            $options['method'] ?? 'bank_transfer',
                            $options['reference'] ?? null,
                        );
                        $reference = $reference ?? $payment->payment_no;
                    }

                    $commission->forceFill(['received_amount' => $amount]);
                    break;
            }

            $commission->forceFill(['status' => $to])->save();

            $this->writeHistory($commission, $from, $to, $actor, $amount, $options['note'] ?? null, $reference);

            if ($to === 'received') {
                $this->computeAgentShares($commission);
            }

            return $commission->refresh();
        });
    }

    /**
     * Eligibility gate (report §5.6): arrival + registration + first-year
     * tuition paid. Arrival comes from the student status (wired to the
     * visa flow in M6); payment from the acceptance-generated invoice.
     */
    private function guardEligibility(Commission $commission): void
    {
        $commission->loadMissing('application.student');
        $student = $commission->application->student;

        if ($student->status !== 'arrived') {
            throw new ConflictHttpException('Not eligible: the student has not arrived/registered yet.');
        }

        $tuitionPaid = Invoice::query()
            ->where('application_id', $commission->application_id)
            ->where('party_type', 'student')
            ->where('status', 'paid')
            ->exists();

        if (! $tuitionPaid) {
            throw new ConflictHttpException('Not eligible: first-year tuition is not fully paid.');
        }
    }

    private function createUniversityInvoice(Commission $commission, User $actor): Invoice
    {
        $commission->loadMissing(['application.student', 'university']);
        $student = $commission->application->student;

        return $this->invoices->create(
            partyType: 'university',
            partyId: $commission->university_id,
            applicationId: $commission->application_id,
            currency: $commission->currency,
            items: [[
                'description' => "Recruitment commission — {$student->full_name} ({$student->student_code})",
                'unit_price' => (float) $commission->eligible_amount,
            ]],
            actor: $actor,
        );
    }

    private function universityInvoice(Commission $commission): ?Invoice
    {
        return Invoice::query()
            ->where('application_id', $commission->application_id)
            ->where('party_type', 'university')
            ->latest('id')
            ->first();
    }

    /**
     * Cascade: chain from root partner down to the record's agent.
     * gross(level) = share% × received (or fixed value);
     * payable(level) = gross(level) − gross(child level).
     */
    private function computeAgentShares(Commission $commission): void
    {
        $commission->loadMissing('application.student');

        $agent = $commission->application->agent_id
            ? Agent::find($commission->application->agent_id)
            : $commission->application->student?->agent;

        if (! $agent) {
            return;
        }

        // Bottom-up chain, then reverse to top-down (partner first).
        $chain = collect();
        for ($node = $agent; $node !== null; $node = $node->parent) {
            $chain->push($node);
        }
        $chain = $chain->reverse()->values();

        $received = (float) $commission->received_amount;

        $gross = $chain->map(function (Agent $node) use ($received) {
            $agreement = $node->agreements()
                ->where(fn ($q) => $q->whereNull('valid_from')->orWhere('valid_from', '<=', now()))
                ->where(fn ($q) => $q->whereNull('valid_to')->orWhere('valid_to', '>=', now()))
                ->orderByDesc('valid_from')
                ->first();

            return match ($agreement?->share_type) {
                'percent' => round($received * (float) $agreement->share_value / 100, 2),
                'fixed' => (float) $agreement->share_value,
                default => 0.0,
            };
        });

        foreach ($chain as $index => $node) {
            $net = $gross[$index] - ($gross[$index + 1] ?? 0.0);

            if ($net <= 0) {
                continue;
            }

            AgentPayable::create([
                'commission_id' => $commission->id,
                'agent_id' => $node->id,
                'amount' => $net,
                'currency' => $commission->currency,
                'status' => 'payable',
                'computed_at' => now(),
            ]);
        }
    }

    private function writeHistory(
        Commission $commission,
        ?string $from,
        string $to,
        User $actor,
        ?float $amount = null,
        ?string $note = null,
        ?string $reference = null,
    ): void {
        CommissionStatusHistory::create([
            'commission_id' => $commission->id,
            'from_status' => $from,
            'to_status' => $to,
            'amount' => $amount,
            'reference' => $reference ?? $note,
            'changed_by' => $actor->id,
            'created_at' => now(),
        ]);
    }
}

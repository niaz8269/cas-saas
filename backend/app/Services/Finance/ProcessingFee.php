<?php

namespace App\Services\Finance;

use App\Models\Application;
use App\Models\BankAccount;
use App\Models\Invoice;
use App\Models\Setting;
use App\Models\Student;
use App\Services\Admissions\ApplicationCatalog;

/**
 * The one-time, non-refundable CAS application fee a student pays on the
 * student portal: 500 CNY when they apply for a scholarship (funded study) and
 * 1,000 CNY when they apply to a self-funded program.
 *
 * Distinct from two things it is easily confused with: the university's own
 * application fee (CAS never collects it) and the per-course CAS service
 * charge ({@see ApplicationCatalog::serviceChargeFor}), which stays hidden from
 * the student until the CAS team confirms it.
 *
 * Business rules, as agreed:
 *  - charged ONCE PER STUDENT, not per application — a student exploring three
 *    scholarships pays once and their later applications sail past the gate;
 *  - a student who paid the scholarship fee and later applies to a self-funded
 *    program owes only the difference (a top-up invoice), never the full fee again;
 *  - the application is NOT submitted on receipt upload; it waits until Finance
 *    confirms the payment, then releases automatically;
 *  - partner-filed applications are exempt — this is a student-portal rule.
 *
 * The amount lives in `settings` so Finance can change it without a deploy.
 */
class ProcessingFee
{
    /** Marks the invoice line, so the fee is identifiable forever after. */
    public const FEE_TYPE = 'processing_fee';

    private const SETTING_KEY = 'finance.processing_fee';

    private const INSTRUCTIONS_KEY = 'finance.payment_instructions';

    /** Billed when Finance has not set amounts in `settings`. */
    private const FALLBACK = [
        'scholarship' => ['amount' => 500.0, 'currency' => 'CNY'],
        'self' => ['amount' => 1000.0, 'currency' => 'CNY'],
    ];

    public function __construct(private readonly InvoiceService $invoices) {}

    /**
     * The fee for a kind of study: 'scholarship' (funded) or 'self'. Settings may
     * hold either the tiered shape {scholarship: {...}, self: {...}} or the older
     * single {amount, currency}, which then applies to every tier.
     *
     * @return array{amount: float, currency: string}
     */
    public function amount(string $tier = 'scholarship'): array
    {
        $value = Setting::query()->where('key', self::SETTING_KEY)->value('value');
        $fallback = self::FALLBACK[$tier];

        if (is_array($value) && isset($value[$tier]['amount'])) {
            $value = $value[$tier];
        } elseif (! is_array($value) || ! isset($value['amount'])) {
            return $fallback;
        }

        return [
            'amount' => (float) $value['amount'],
            'currency' => strtoupper((string) ($value['currency'] ?? $fallback['currency'])),
        ];
    }

    /** Which tier an application falls in: self-funded programs carry the higher fee. */
    public function tierFor(Application $application): string
    {
        return $application->kind === 'scholarship' || $application->scholarship_id !== null ? 'scholarship' : 'self';
    }

    /**
     * How to pay: free-text bank details or a payment link, set by Finance.
     * Null until configured — the portal then shows the amount owed and tells
     * the student to contact CAS, rather than inventing instructions.
     */
    public function instructions(): ?string
    {
        $value = Setting::query()->where('key', self::INSTRUCTIONS_KEY)->value('value');

        $text = is_array($value) ? ($value['text'] ?? null) : null;

        return is_string($text) && trim($text) !== '' ? trim($text) : null;
    }

    /**
     * Does this application attract the fee? Every application a student files
     * on their own does, scholarship or self-funded. Partner-filed ones are
     * exempt by decision.
     */
    public function appliesTo(Application $application): bool
    {
        return $application->agent_id === null;
    }

    /**
     * The student's processing-fee invoice, whatever its state. Cancelled ones
     * are ignored so a voided invoice can be re-raised.
     */
    public function invoiceFor(Student $student): ?Invoice
    {
        return Invoice::query()
            ->where('party_type', 'student')
            ->where('party_id', $student->id)
            ->where('status', '!=', 'cancelled')
            ->whereHas('items', fn ($q) => $q->where('fee_type', self::FEE_TYPE))
            ->orderBy('id')
            ->first();
    }

    /** Every fee invoice of the student, cancelled ones excluded. */
    private function feeInvoices(Student $student)
    {
        return Invoice::query()
            ->where('party_type', 'student')
            ->where('party_id', $student->id)
            ->where('status', '!=', 'cancelled')
            ->whereHas('items', fn ($q) => $q->where('fee_type', self::FEE_TYPE))
            ->orderBy('id')
            ->get();
    }

    /** Has this student settled a fee, with nothing outstanding? */
    public function isSettled(Student $student): bool
    {
        $invoices = $this->feeInvoices($student);

        return $invoices->isNotEmpty() && $invoices->every(fn (Invoice $i) => $i->status === 'paid');
    }

    /** Has the student paid enough, with nothing outstanding, for THIS application's tier? */
    public function isSettledFor(Application $application): bool
    {
        $invoices = $this->feeInvoices($application->student);
        $needed = $this->amount($this->tierFor($application))['amount'];

        return $invoices->isNotEmpty()
            && $invoices->every(fn (Invoice $i) => $i->status === 'paid')
            && (float) $invoices->sum('total') >= $needed;
    }

    /**
     * The invoice the student must pay for this application, raising it if
     * needed. Idempotent: repeated submit attempts reuse the same invoice. A
     * student whose earlier, smaller fee was paid owes only the difference.
     */
    public function ensureInvoice(Application $application): Invoice
    {
        $student = $application->student;
        $invoices = $this->feeInvoices($student);

        if ($open = $invoices->first(fn (Invoice $i) => $i->status !== 'paid')) {
            return $open;
        }

        $fee = $this->amount($this->tierFor($application));
        $already = (float) $invoices->sum('total');

        if ($invoices->isNotEmpty() && $already >= $fee['amount']) {
            return $invoices->last();
        }

        $topUp = $invoices->isNotEmpty();

        return $this->invoices->create(
            partyType: 'student',
            partyId: $student->id,
            applicationId: $application->id,
            currency: $fee['currency'],
            items: [[
                'fee_type' => self::FEE_TYPE,
                'description' => $topUp
                    ? 'CAS application fee, top-up for a self-funded program (non-refundable)'
                    : 'CAS application fee (one-time, non-refundable)',
                'qty' => 1,
                'unit_price' => $fee['amount'] - $already,
            ]],
            actor: null, // raised by the system on the student's own action
            // Nobody is choosing an account here, so use the default one (if set).
            bankAccountId: BankAccount::defaultFor($fee['currency'])?->id,
        );
    }
}

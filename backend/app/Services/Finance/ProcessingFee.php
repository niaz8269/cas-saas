<?php

namespace App\Services\Finance;

use App\Models\Application;
use App\Models\Invoice;
use App\Models\Setting;
use App\Models\Student;
use App\Services\Admissions\ApplicationCatalog;

/**
 * The one-time, non-refundable CAS processing fee for FUNDED study — a
 * scholarship, partially funded, or government-scholarship application.
 *
 * Distinct from two things it is easily confused with: the university's own
 * application fee (CAS never collects it) and the per-course CAS service
 * charge ({@see ApplicationCatalog::serviceChargeFor}),
 * which Finance proposes on the tuition invoice much later.
 *
 * Business rules, as agreed:
 *  - charged ONCE PER STUDENT, not per application — a student exploring three
 *    scholarships pays once and their later applications sail past the gate;
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

    private const FALLBACK = ['amount' => 100.0, 'currency' => 'USD'];

    public function __construct(private readonly InvoiceService $invoices) {}

    /**
     * @return array{amount: float, currency: string}
     */
    public function amount(): array
    {
        $value = Setting::query()->where('key', self::SETTING_KEY)->value('value');

        if (! is_array($value) || ! isset($value['amount'])) {
            return self::FALLBACK;
        }

        return [
            'amount' => (float) $value['amount'],
            'currency' => strtoupper((string) ($value['currency'] ?? self::FALLBACK['currency'])),
        ];
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
     * Does this application attract the fee? Funded study means a government
     * scholarship application, or a course application with an award attached
     * (self-funded applications never carry a scholarship_id).
     */
    public function appliesTo(Application $application): bool
    {
        if ($application->agent_id !== null) {
            return false; // partner-filed — exempt by decision
        }

        return $application->kind === 'scholarship' || $application->scholarship_id !== null;
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

    /** Has this student already settled the fee? Once true, always true. */
    public function isSettled(Student $student): bool
    {
        return $this->invoiceFor($student)?->status === 'paid';
    }

    /**
     * The student's processing-fee invoice, raising it if this is their first
     * funded application. Idempotent: repeated submit attempts reuse the same
     * invoice rather than billing the student again.
     */
    public function ensureInvoice(Application $application): Invoice
    {
        $student = $application->student;

        if ($existing = $this->invoiceFor($student)) {
            return $existing;
        }

        $fee = $this->amount();

        return $this->invoices->create(
            partyType: 'student',
            partyId: $student->id,
            applicationId: $application->id,
            currency: $fee['currency'],
            items: [[
                'fee_type' => self::FEE_TYPE,
                'description' => 'CAS processing fee — scholarship application (one-time, non-refundable)',
                'qty' => 1,
                'unit_price' => $fee['amount'],
            ]],
            actor: null, // raised by the system on the student's own action
        );
    }
}

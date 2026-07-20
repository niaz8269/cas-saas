<?php

use App\Models\Agent;
use App\Models\AgentPayable;
use App\Models\Application;
use App\Models\Commission;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

const FINANCE_PERMS = [
    'finance.view.global', 'finance.manage.global',
    'commission.view.global', 'commission.manage.global',
];
const FIN_COUNSELOR_PERMS = ['commission.view.own'];

// ── Invoices ────────────────────────────────────────────────────────────

it('lists invoices with resolved party names for finance staff', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $student = Student::factory()->create(['first_name' => 'Ali', 'last_name' => 'Khan']);
    Invoice::factory()->create(['party_type' => 'student', 'party_id' => $student->id]);

    $this->getJson('/api/v1/invoices')
        ->assertOk()
        ->assertJsonPath('data.0.party_name', 'Ali Khan');
});

it('denies invoices without finance.view.global', function () {
    actingAsStaffWith(FIN_COUNSELOR_PERMS);

    $this->getJson('/api/v1/invoices')->assertStatus(403);
});

it('records payments and follows the running paid status', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $invoice = Invoice::factory()->create(['total' => 10000, 'status' => 'issued']);

    $this->postJson("/api/v1/invoices/{$invoice->id}/payments", [
        'amount' => 4000, 'method' => 'bank_transfer', 'reference' => 'TXN-1',
    ])->assertOk()->assertJsonPath('data.status', 'partially_paid');

    $this->postJson("/api/v1/invoices/{$invoice->id}/payments", ['amount' => 6000])
        ->assertOk()
        ->assertJsonPath('data.status', 'paid')
        ->assertJsonPath('data.amount_paid', '10000.00');
});

it('rejects overpayments with a validation error', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $invoice = Invoice::factory()->create(['total' => 1000, 'status' => 'issued']);

    $this->postJson("/api/v1/invoices/{$invoice->id}/payments", ['amount' => 1500])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['amount']);
});

it('blocks payment recording without finance.manage.global', function () {
    actingAsStaffWith(['finance.view.global']);
    $invoice = Invoice::factory()->create();

    $this->postJson("/api/v1/invoices/{$invoice->id}/payments", ['amount' => 100])
        ->assertStatus(403);
});

it('voids an unpaid invoice raised in error', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $invoice = Invoice::factory()->create(['status' => 'issued', 'amount_paid' => 0]);

    $this->postJson("/api/v1/invoices/{$invoice->id}/void")
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled');

    expect($invoice->fresh()->status)->toBe('cancelled');
});

it('refuses to void an invoice that has payments', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $invoice = Invoice::factory()->create(['total' => 1000, 'status' => 'partially_paid', 'amount_paid' => 400]);

    $this->postJson("/api/v1/invoices/{$invoice->id}/void")
        ->assertStatus(422)
        ->assertJsonValidationErrors('status');

    expect($invoice->fresh()->status)->toBe('partially_paid');
});

it('refuses to void an already-cancelled invoice', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $invoice = Invoice::factory()->create(['status' => 'cancelled', 'amount_paid' => 0]);

    $this->postJson("/api/v1/invoices/{$invoice->id}/void")
        ->assertStatus(422)
        ->assertJsonValidationErrors('status');
});

it('blocks voiding without finance.manage.global', function () {
    actingAsStaffWith(['finance.view.global']);
    $invoice = Invoice::factory()->create(['amount_paid' => 0]);

    $this->postJson("/api/v1/invoices/{$invoice->id}/void")->assertStatus(403);
});

it('records a refund as an append-only negative receipt and lowers the paid total', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $invoice = Invoice::factory()->create(['total' => 10000, 'status' => 'paid', 'amount_paid' => 10000]);

    $this->postJson("/api/v1/invoices/{$invoice->id}/refunds", ['amount' => 4000, 'reference' => 'Overcharge'])
        ->assertOk()
        ->assertJsonPath('data.status', 'partially_paid')
        ->assertJsonPath('data.amount_paid', '6000.00');

    $refund = $invoice->payments()->latest('id')->first();
    expect((float) $refund->amount)->toBe(-4000.0)
        ->and($refund->method)->toBe('refund')
        ->and($refund->reference)->toBe('Overcharge')
        ->and((float) $invoice->fresh()->amount_paid)->toBe(6000.0);
});

it('flips an invoice back to issued when fully refunded', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $invoice = Invoice::factory()->create(['total' => 5000, 'status' => 'paid', 'amount_paid' => 5000]);

    $this->postJson("/api/v1/invoices/{$invoice->id}/refunds", ['amount' => 5000, 'reference' => 'Cancelled enrolment'])
        ->assertOk()
        ->assertJsonPath('data.status', 'issued');

    expect((float) $invoice->fresh()->amount_paid)->toBe(0.0);
});

it('rejects a refund larger than the amount paid', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $invoice = Invoice::factory()->create(['total' => 5000, 'status' => 'partially_paid', 'amount_paid' => 2000]);

    $this->postJson("/api/v1/invoices/{$invoice->id}/refunds", ['amount' => 3000, 'reference' => 'x'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('amount');
});

it('requires a reason for a refund', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $invoice = Invoice::factory()->create(['total' => 5000, 'status' => 'paid', 'amount_paid' => 5000]);

    $this->postJson("/api/v1/invoices/{$invoice->id}/refunds", ['amount' => 1000])
        ->assertStatus(422)
        ->assertJsonValidationErrors('reference');
});

it('blocks refunds without finance.manage.global', function () {
    actingAsStaffWith(['finance.view.global']);
    $invoice = Invoice::factory()->create(['total' => 5000, 'status' => 'paid', 'amount_paid' => 5000]);

    $this->postJson("/api/v1/invoices/{$invoice->id}/refunds", ['amount' => 1000, 'reference' => 'x'])
        ->assertStatus(403);
});

// ── Commissions ─────────────────────────────────────────────────────────

it('shows finance the full pipeline with totals meta', function () {
    actingAsStaffWith(FINANCE_PERMS);
    Commission::factory()->create(['expected_amount' => 3000]);
    Commission::factory()->create(['expected_amount' => 5000]);

    $response = $this->getJson('/api/v1/commissions')->assertOk();

    expect($response->json('meta.total'))->toBe(2)
        ->and($response->json('pipeline.expected.count'))->toBe(2)
        ->and($response->json('pipeline.expected.expected_total'))->toBe(8000);
});

it('scopes counselors to their own students commissions', function () {
    $counselor = actingAsStaffWith(FIN_COUNSELOR_PERMS);
    $myStudent = Student::factory()->create(['assigned_counselor_id' => $counselor->id]);
    $myApp = Application::factory()->create(['student_id' => $myStudent->id]);
    $mine = Commission::factory()->create([
        'application_id' => $myApp->id, 'university_id' => $myApp->university_id,
    ]);
    Commission::factory()->create(); // someone else's

    $response = $this->getJson('/api/v1/commissions')->assertOk();

    expect($response->json('meta.total'))->toBe(1)
        ->and($response->json('data.0.id'))->toBe($mine->id);

    // Direct access to the other one is denied.
    $other = Commission::where('id', '!=', $mine->id)->first();
    $this->getJson("/api/v1/commissions/{$other->id}")->assertStatus(403);
});

it('transitions commissions through the API with history', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $commission = Commission::factory()->create(); // expected

    $this->postJson("/api/v1/commissions/{$commission->id}/transition", [
        'status' => 'pending_arrival',
        'note' => 'Visa approved, awaiting enrollment',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'pending_arrival');

    expect($commission->fresh()->statusHistory()->count())->toBe(1);
});

it('returns 409 for illegal commission jumps via the API', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $commission = Commission::factory()->create();

    $this->postJson("/api/v1/commissions/{$commission->id}/transition", ['status' => 'received'])
        ->assertStatus(409)
        ->assertJsonPath('code', 'CONFLICT');
});

it('denies transitions to counselors', function () {
    $counselor = actingAsStaffWith(FIN_COUNSELOR_PERMS);
    $myStudent = Student::factory()->create(['assigned_counselor_id' => $counselor->id]);
    $myApp = Application::factory()->create(['student_id' => $myStudent->id]);
    $commission = Commission::factory()->create([
        'application_id' => $myApp->id, 'university_id' => $myApp->university_id,
    ]);

    $this->postJson("/api/v1/commissions/{$commission->id}/transition", ['status' => 'pending_arrival'])
        ->assertStatus(403);
});

// ── Agent payables ──────────────────────────────────────────────────────

it('lists payables and records payouts flipping them to paid', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $agent = Agent::factory()->create(['name' => 'Global Study Partners']);
    $payable = AgentPayable::factory()->for($agent)->create(['amount' => 2400]);

    $this->getJson('/api/v1/agent-payables')
        ->assertOk()
        ->assertJsonPath('data.0.agent.name', 'Global Study Partners');

    $this->postJson("/api/v1/agent-payables/{$payable->id}/pay", [
        'reference' => 'BANK-OUT-42',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'paid');

    expect($payable->fresh()->payments()->count())->toBe(1);
});

it('requires payout evidence (reference)', function () {
    actingAsStaffWith(FINANCE_PERMS);
    $payable = AgentPayable::factory()->create();

    $this->postJson("/api/v1/agent-payables/{$payable->id}/pay", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['reference']);
});

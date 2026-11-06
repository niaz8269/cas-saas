<?php

use App\Models\Application;
use App\Models\BankAccount;
use App\Models\DocumentType;
use App\Models\Invoice;
use App\Models\Scholarship;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// The bank-transfer payment flow end to end, plus the rough edges a manual
// walkthrough turned up (cancelled invoices, receipts left "pending").

/** A government-scholarship draft with its documents satisfied. */
function flowDraft(Student $student): int
{
    $gov = Scholarship::factory()->create(['scope' => 'government', 'university_id' => null, 'status' => 'active']);
    $passport = DocumentType::firstOrCreate(['name' => 'Passport'], ['category' => 'identity']);

    $id = test()->postJson('/api/v1/student/scholarship-applications', [
        'scholarship_id' => $gov->id, 'level' => 'bachelor',
    ])->json('data.id');

    test()->postJson("/api/v1/student/applications/{$id}/documents", [
        'document_type_id' => $passport->id,
        'key' => "students/{$student->id}/applications/{$id}/passport.jpg",
        'file_name' => 'passport.jpg', 'mime' => 'image/jpeg', 'size' => 1000,
    ])->assertCreated();

    return $id;
}

function flowAccount(array $over = []): BankAccount
{
    return BankAccount::create(array_merge([
        'label' => 'BOC CNY', 'bank_name' => 'Bank of China', 'account_name' => 'CAS Ltd',
        'account_number' => '6217000000001234', 'currency' => 'CNY', 'is_default' => true,
    ], $over));
}

it('walks a student from draft to a released application through a bank transfer', function () {
    $account = flowAccount();
    $student = actingAsStudentPortal();
    $id = flowDraft($student);

    // First submit is held for the fee, and the invoice already points at the default account.
    $this->postJson("/api/v1/student/applications/{$id}/submit")->assertStatus(409)->assertJsonPath('code', 'PROCESSING_FEE_DUE');
    $invoice = Invoice::where('party_id', $student->id)->sole();
    expect($invoice->bank_account_id)->toBe($account->id);

    // The student sees where to pay, on the fee screen and on the voucher.
    $this->getJson('/api/v1/student/processing-fee')
        ->assertOk()
        ->assertJsonPath('data.invoice.bank_account.bank_name', 'Bank of China')
        ->assertJsonPath('data.invoice.bank_account.account_number', '6217000000001234');
    $this->get("/api/v1/student/invoices/{$invoice->id}/voucher")->assertOk();

    // They file a receipt; the application is still waiting.
    $this->postJson("/api/v1/student/invoices/{$invoice->id}/receipt", [
        'key' => "students/{$student->id}/slip.jpg", 'file_name' => 'slip.jpg', 'mime' => 'image/jpeg', 'size' => 2048,
    ])->assertCreated();
    expect(Application::find($id)->status)->toBe('draft');

    // Finance confirms it and the application goes through.
    actingAsStaffWith(['finance.manage.global']);
    $this->postJson("/api/v1/invoices/{$invoice->id}/payments", ['amount' => 500, 'method' => 'bank_transfer'])->assertOk();

    expect($invoice->refresh()->status)->toBe('paid')
        ->and(Application::find($id)->status)->toBe('under_review');
});

it('does not put a mismatched-currency default account on the fee invoice', function () {
    flowAccount(['currency' => 'USD']);
    $student = actingAsStudentPortal();
    $id = flowDraft($student);

    $this->postJson("/api/v1/student/applications/{$id}/submit")->assertStatus(409);

    expect(Invoice::where('party_id', $student->id)->sole()->bank_account_id)->toBeNull();
});

it('marks the filed receipt verified and links it when the invoice is settled', function () {
    $student = actingAsStudentPortal();
    $id = flowDraft($student);
    $this->postJson("/api/v1/student/applications/{$id}/submit")->assertStatus(409);
    $invoice = Invoice::where('party_id', $student->id)->sole();

    $this->postJson("/api/v1/student/invoices/{$invoice->id}/receipt", [
        'key' => "students/{$student->id}/slip.jpg", 'file_name' => 'slip.jpg', 'mime' => 'image/jpeg', 'size' => 2048,
    ])->assertCreated();
    $receipt = $invoice->documents()->sole();
    expect($receipt->status)->toBe('pending');

    $finance = actingAsStaffWith(['finance.manage.global']);
    $this->postJson("/api/v1/invoices/{$invoice->id}/payments", ['amount' => 500])->assertOk();

    expect($receipt->refresh()->status)->toBe('verified')
        ->and($receipt->verified_by)->toBe($finance->id)
        ->and($invoice->payments()->sole()->document_id)->toBe($receipt->id);
});

it('leaves a receipt pending after only a partial payment', function () {
    $student = actingAsStudentPortal();
    $id = flowDraft($student);
    $this->postJson("/api/v1/student/applications/{$id}/submit")->assertStatus(409);
    $invoice = Invoice::where('party_id', $student->id)->sole();

    $this->postJson("/api/v1/student/invoices/{$invoice->id}/receipt", [
        'key' => "students/{$student->id}/slip.jpg", 'file_name' => 'slip.jpg', 'mime' => 'image/jpeg', 'size' => 2048,
    ])->assertCreated();

    actingAsStaffWith(['finance.manage.global']);
    $this->postJson("/api/v1/invoices/{$invoice->id}/payments", ['amount' => 100])->assertOk();

    expect($invoice->refresh()->status)->toBe('partially_paid')
        ->and($invoice->documents()->sole()->status)->toBe('pending');
});

it('hides a cancelled invoice from the student, including its voucher and pdf', function () {
    $student = actingAsStudentPortal();
    $open = Invoice::factory()->create(['party_type' => 'student', 'party_id' => $student->id, 'status' => 'issued']);
    $voided = Invoice::factory()->create(['party_type' => 'student', 'party_id' => $student->id, 'status' => 'cancelled']);

    $ids = collect($this->getJson('/api/v1/student/invoices')->assertOk()->json('data'))->pluck('id');

    expect($ids->all())->toBe([$open->id]);
    $this->get("/api/v1/student/invoices/{$voided->id}/voucher")->assertNotFound();
    $this->get("/api/v1/student/invoices/{$voided->id}/pdf")->assertNotFound();
    $this->get("/api/v1/student/invoices/{$open->id}/voucher")->assertOk();
});

it('applies the default account to open invoices when a staff user marks one default', function () {
    $student = Student::factory()->create();
    $waiting = Invoice::factory()->create(['party_type' => 'student', 'party_id' => $student->id, 'status' => 'issued', 'currency' => 'CNY', 'bank_account_id' => null]);

    actingAsStaffWith(['finance.view.global', 'finance.manage.global']);
    $this->postJson('/api/v1/bank-accounts', [
        'label' => 'BOC', 'bank_name' => 'BOC', 'account_name' => 'CAS', 'account_number' => '1', 'currency' => 'CNY', 'is_default' => true,
    ])->assertCreated()->assertJsonPath('meta.assigned_invoices', 1);

    expect($waiting->refresh()->bank_account_id)->not->toBeNull();

    Sanctum::actingAs($student, guard: 'student');
    $this->getJson('/api/v1/student/invoices')->assertOk()->assertJsonPath('data.0.bank_account.bank_name', 'BOC');
});

<?php

use App\Models\BankAccount;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function bankPayload(array $over = []): array
{
    return array_merge([
        'label' => 'BOC CNY Shanghai',
        'bank_name' => 'Bank of China',
        'account_name' => 'CAS Consultancy Ltd',
        'account_number' => '6217000000001234',
        'swift' => 'BKCHCNBJ300',
        'currency' => 'CNY',
    ], $over);
}

it('lets finance add, edit and retire bank accounts', function () {
    actingAsStaffWith(['finance.view.global', 'finance.manage.global']);

    $id = $this->postJson('/api/v1/bank-accounts', bankPayload())
        ->assertCreated()->assertJsonPath('data.bank_name', 'Bank of China')->json('data.id');

    $this->patchJson("/api/v1/bank-accounts/{$id}", ['is_active' => false])->assertOk();

    // Inactive accounts leave the picker but stay visible to the manager.
    $this->getJson('/api/v1/bank-accounts')->assertOk()->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/bank-accounts?all=1')->assertOk()->assertJsonCount(1, 'data');

    $this->deleteJson("/api/v1/bank-accounts/{$id}")->assertOk();
    expect(BankAccount::count())->toBe(0);
});

it('lets view-only staff read active accounts but not change them', function () {
    actingAsStaffWith(['finance.view.global']);
    BankAccount::create(bankPayload());

    $this->getJson('/api/v1/bank-accounts')->assertOk()->assertJsonCount(1, 'data');
    $this->postJson('/api/v1/bank-accounts', bankPayload())->assertForbidden();
});

it('denies bank accounts to staff without finance access', function () {
    actingAsStaffWith(['commission.view.own']);

    $this->getJson('/api/v1/bank-accounts')->assertForbidden();
});

it('stores the chosen account on a new invoice and rejects inactive ones', function () {
    actingAsStaffWith(['finance.view.global', 'finance.manage.global']);
    $student = Student::factory()->create();
    $active = BankAccount::create(bankPayload());
    $inactive = BankAccount::create(bankPayload(['label' => 'Old', 'is_active' => false]));

    $body = [
        'party_type' => 'student', 'party_id' => $student->id, 'currency' => 'CNY',
        'items' => [['description' => 'Service charge', 'unit_price' => 500]],
    ];

    $this->postJson('/api/v1/invoices', $body + ['bank_account_id' => $inactive->id])
        ->assertStatus(422)->assertJsonValidationErrors(['bank_account_id']);

    $this->postJson('/api/v1/invoices', $body + ['bank_account_id' => $active->id])
        ->assertCreated()->assertJsonPath('data.bank_account.account_number', '6217000000001234');
});

it('assigns an account to an open invoice but not a settled one', function () {
    actingAsStaffWith(['finance.view.global', 'finance.manage.global']);
    $account = BankAccount::create(bankPayload());
    $open = Invoice::factory()->create(['status' => 'issued']);
    $paid = Invoice::factory()->create(['status' => 'paid']);

    $this->postJson("/api/v1/invoices/{$open->id}/bank-account", ['bank_account_id' => $account->id])
        ->assertOk()->assertJsonPath('data.bank_account_id', $account->id);

    $this->postJson("/api/v1/invoices/{$paid->id}/bank-account", ['bank_account_id' => $account->id])
        ->assertStatus(422);
});

it('keeps showing a removed account on invoices that used it', function () {
    actingAsStaffWith(['finance.view.global', 'finance.manage.global']);
    $account = BankAccount::create(bankPayload());
    $invoice = Invoice::factory()->create(['status' => 'issued', 'bank_account_id' => $account->id]);

    $account->delete();

    $this->getJson("/api/v1/invoices/{$invoice->id}")
        ->assertOk()->assertJsonPath('data.bank_account.bank_name', 'Bank of China');
});

it('shows a student only the account chosen for their own invoice', function () {
    $student = actingAsStudentPortal();
    $account = BankAccount::create(bankPayload());
    BankAccount::create(bankPayload(['label' => 'Other', 'bank_name' => 'Other Bank']));
    Invoice::factory()->create([
        'party_type' => 'student', 'party_id' => $student->id,
        'status' => 'issued', 'bank_account_id' => $account->id,
    ]);

    $this->getJson('/api/v1/student/invoices')
        ->assertOk()
        ->assertJsonPath('data.0.bank_account.bank_name', 'Bank of China');
});

<?php

use App\Models\Agent;
use App\Models\Application;
use App\Models\DocumentType;
use App\Models\Invoice;
use App\Models\Scholarship;
use App\Models\Setting;
use App\Models\Student;
use App\Services\Finance\ProcessingFee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

/** A government-scholarship draft with its documents already satisfied. */
function feeReadyDraft(Student $student): int
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

it('raises the fee invoice on the first submit and never bills twice', function () {
    $student = actingAsStudentPortal();

    $first = feeReadyDraft($student);
    $this->postJson("/api/v1/student/applications/{$first}/submit")->assertStatus(409);

    // A second attempt reuses the invoice rather than raising another.
    $this->postJson("/api/v1/student/applications/{$first}/submit")->assertStatus(409);

    // So does a whole second application — the fee is once per STUDENT.
    $second = feeReadyDraft($student);
    $this->postJson("/api/v1/student/applications/{$second}/submit")->assertStatus(409);

    $invoices = Invoice::where('party_type', 'student')->where('party_id', $student->id)->get();

    expect($invoices)->toHaveCount(1)
        ->and((float) $invoices->first()->total)->toBe(100.0)
        ->and($invoices->first()->currency)->toBe('USD')
        ->and($invoices->first()->status)->toBe('issued')
        ->and($invoices->first()->items->first()->fee_type)->toBe(ProcessingFee::FEE_TYPE);
});

it('reads the amount from settings so Finance can change it', function () {
    Setting::create(['key' => 'finance.processing_fee', 'group' => 'finance', 'value' => ['amount' => 150, 'currency' => 'EUR']]);

    $student = actingAsStudentPortal();
    $id = feeReadyDraft($student);

    $this->postJson("/api/v1/student/applications/{$id}/submit")
        ->assertStatus(409)
        ->assertJsonPath('invoice.total', 150)
        ->assertJsonPath('invoice.currency', 'EUR');
});

it('never charges a self-funded application', function () {
    actingAsStudentPortal();

    // No scholarship attached — the ordinary self-funded path.
    $application = Application::factory()->create(['scholarship_id' => null, 'agent_id' => null, 'kind' => 'course']);

    expect(app(ProcessingFee::class)->appliesTo($application))->toBeFalse();
});

it('never charges a partner-filed application', function () {
    $agent = Agent::factory()->create();
    $application = Application::factory()->create(['agent_id' => $agent->id, 'kind' => 'scholarship']);

    expect(app(ProcessingFee::class)->appliesTo($application))->toBeFalse();
});

it('lets the student see what is owed and file a receipt against it', function () {
    $student = actingAsStudentPortal();
    $id = feeReadyDraft($student);
    $this->postJson("/api/v1/student/applications/{$id}/submit")->assertStatus(409);

    $this->getJson('/api/v1/student/processing-fee')
        ->assertOk()
        ->assertJsonPath('data.settled', false)
        ->assertJsonPath('data.fee.amount', 100)
        ->assertJsonPath('data.invoice.status', 'issued');

    $invoiceId = Invoice::where('party_id', $student->id)->value('id');

    $this->postJson("/api/v1/student/invoices/{$invoiceId}/receipt", [
        'key' => "students/{$student->id}/receipt.jpg",
        'file_name' => 'receipt.jpg', 'mime' => 'image/jpeg', 'size' => 2048,
    ])->assertCreated();

    // The receipt does NOT submit the application — Finance must confirm.
    expect(Application::find($id)->status)->toBe('draft');

    $this->getJson('/api/v1/student/processing-fee')
        ->assertOk()
        ->assertJsonPath('data.invoice.receipts.0.file_name', 'receipt.jpg')
        ->assertJsonPath('data.invoice.receipts.0.status', 'pending');
});

it('refuses a receipt against another students invoice', function () {
    $student = actingAsStudentPortal();
    $other = Student::factory()->create();
    $theirs = Invoice::factory()->create(['party_type' => 'student', 'party_id' => $other->id, 'status' => 'issued']);

    $this->postJson("/api/v1/student/invoices/{$theirs->id}/receipt", [
        'key' => "students/{$student->id}/receipt.jpg",
        'file_name' => 'receipt.jpg', 'mime' => 'image/jpeg', 'size' => 2048,
    ])->assertNotFound();
});

it('refuses a receipt whose storage key belongs to someone else', function () {
    $student = actingAsStudentPortal();
    $id = feeReadyDraft($student);
    $this->postJson("/api/v1/student/applications/{$id}/submit")->assertStatus(409);
    $invoiceId = Invoice::where('party_id', $student->id)->value('id');

    $this->postJson("/api/v1/student/invoices/{$invoiceId}/receipt", [
        'key' => 'students/999999/receipt.jpg',
        'file_name' => 'receipt.jpg', 'mime' => 'image/jpeg', 'size' => 2048,
    ])->assertStatus(422);
});

it('submits the held application when Finance confirms the payment', function () {
    $student = actingAsStudentPortal();
    $id = feeReadyDraft($student);
    $this->postJson("/api/v1/student/applications/{$id}/submit")->assertStatus(409);

    $invoice = Invoice::where('party_id', $student->id)->sole();

    actingAsStaffWith(['finance.manage.global']);

    $this->postJson("/api/v1/invoices/{$invoice->id}/payments", [
        'amount' => 100, 'method' => 'bank_transfer', 'reference' => 'TT-9931',
    ])->assertOk();

    expect($invoice->refresh()->status)->toBe('paid')
        ->and(Application::find($id)->status)->toBe('under_review');
});

it('waves a later application straight through once the fee is settled', function () {
    $student = actingAsStudentPortal();
    $first = feeReadyDraft($student);
    $this->postJson("/api/v1/student/applications/{$first}/submit")->assertStatus(409);

    $invoice = Invoice::where('party_id', $student->id)->sole();
    actingAsStaffWith(['finance.manage.global']);
    $this->postJson("/api/v1/invoices/{$invoice->id}/payments", ['amount' => 100])->assertOk();

    // Back as the student: a brand-new funded application submits immediately.
    Sanctum::actingAs($student, guard: 'student');
    $second = feeReadyDraft($student);

    $this->postJson("/api/v1/student/applications/{$second}/submit")
        ->assertOk()
        ->assertJsonPath('data.status', 'under_review');

    expect(Invoice::where('party_id', $student->id)->count())->toBe(1);
});

it('leaves a documents-short draft alone when the fee is confirmed', function () {
    $student = actingAsStudentPortal();
    $ready = feeReadyDraft($student);
    $this->postJson("/api/v1/student/applications/{$ready}/submit")->assertStatus(409);

    // A second draft with no documents attached at all.
    $gov = Scholarship::factory()->create(['scope' => 'government', 'university_id' => null, 'status' => 'active']);
    $short = $this->postJson('/api/v1/student/scholarship-applications', [
        'scholarship_id' => $gov->id, 'level' => 'master',
    ])->json('data.id');

    $invoice = Invoice::where('party_id', $student->id)->sole();
    actingAsStaffWith(['finance.manage.global']);
    $this->postJson("/api/v1/invoices/{$invoice->id}/payments", ['amount' => 100])->assertOk();

    expect(Application::find($ready)->status)->toBe('under_review')
        ->and(Application::find($short)->status)->toBe('draft');
});

it('does not release applications when an unrelated invoice is paid', function () {
    $student = actingAsStudentPortal();
    $id = feeReadyDraft($student);
    $this->postJson("/api/v1/student/applications/{$id}/submit")->assertStatus(409);

    $tuition = Invoice::factory()->create([
        'party_type' => 'student', 'party_id' => $student->id,
        'status' => 'issued', 'total' => 5000, 'amount_paid' => 0,
    ]);

    actingAsStaffWith(['finance.manage.global']);
    $this->postJson("/api/v1/invoices/{$tuition->id}/payments", ['amount' => 5000])->assertOk();

    expect(Application::find($id)->status)->toBe('draft');
});

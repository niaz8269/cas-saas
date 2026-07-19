<?php

use App\Models\Application;
use App\Models\Invoice;
use App\Models\Program;
use App\Models\Scholarship;
use App\Models\Student;
use App\Models\University;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

const INVOICE_FINANCE_PERMS = ['finance.view.global', 'finance.manage.global'];

it('denies creating an invoice without finance.manage', function () {
    actingAsStaffWith(['finance.view.global']);
    $student = Student::factory()->create();

    $this->postJson('/api/v1/invoices', [
        'party_type' => 'student', 'party_id' => $student->id, 'currency' => 'CNY',
        'items' => [['description' => 'Service charge', 'unit_price' => 100]],
    ])->assertStatus(403);
});

it('creates a student invoice with typed fee lines and correct totals', function () {
    actingAsStaffWith(INVOICE_FINANCE_PERMS);
    $student = Student::factory()->create();

    $this->postJson('/api/v1/invoices', [
        'party_type' => 'student',
        'party_id' => $student->id,
        'currency' => 'cny',
        'items' => [
            ['fee_type' => 'service_charge', 'description' => 'CAS service charge', 'unit_price' => 1200],
            ['fee_type' => 'admission_fee', 'description' => 'Admission fee', 'qty' => 1, 'unit_price' => 300],
        ],
    ])->assertCreated()
        ->assertJsonPath('data.currency', 'CNY')
        ->assertJsonPath('data.status', 'issued')
        ->assertJsonPath('data.total', '1500.00')
        ->assertJsonPath('data.items.0.fee_type', 'service_charge');

    expect(Invoice::count())->toBe(1);
});

it('validates the items and the party', function () {
    actingAsStaffWith(INVOICE_FINANCE_PERMS);

    $this->postJson('/api/v1/invoices', [
        'party_type' => 'student', 'party_id' => 999999, 'currency' => 'CNY', 'items' => [],
    ])->assertStatus(422)->assertJsonValidationErrors(['party_id', 'items']);
});

it('rejects an application that belongs to a different student', function () {
    actingAsStaffWith(INVOICE_FINANCE_PERMS);
    $student = Student::factory()->create();
    $otherApplication = Application::factory()->create(); // different student

    $this->postJson('/api/v1/invoices', [
        'party_type' => 'student', 'party_id' => $student->id, 'currency' => 'CNY',
        'application_id' => $otherApplication->id,
        'items' => [['description' => 'Tuition', 'unit_price' => 100]],
    ])->assertStatus(422)->assertJsonValidationErrors(['application_id']);
});

it('proposes fee lines from the course structure for a self-funded application', function () {
    actingAsStaffWith(INVOICE_FINANCE_PERMS);
    $uni = University::factory()->create();
    $program = Program::factory()->for($uni)->create([
        'tuition_fee' => 40000, 'hostel_fee' => 6000, 'currency' => 'CNY',
        'service_charges' => ['currency' => 'CNY', 'self' => ['student' => 1500, 'agent' => 1000]],
    ]);
    $student = Student::factory()->create();
    $application = Application::factory()->create([
        'student_id' => $student->id, 'university_id' => $uni->id, 'program_id' => $program->id, 'scholarship_id' => null,
    ]);

    $response = $this->getJson("/api/v1/invoices/fee-schedule?application_id={$application->id}")->assertOk();

    $lines = collect($response->json('data.lines'));
    expect($response->json('data.party_type'))->toBe('student')
        ->and($response->json('data.party_id'))->toBe($student->id)
        ->and($response->json('data.currency'))->toBe('CNY')
        ->and($lines->firstWhere('fee_type', 'tuition')['unit_price'])->toEqual(40000)
        ->and($lines->firstWhere('fee_type', 'hostel')['unit_price'])->toEqual(6000)
        ->and($lines->firstWhere('fee_type', 'service_charge')['unit_price'])->toEqual(1500);
});

it('uses the post-scholarship amounts when the application has a scholarship', function () {
    actingAsStaffWith(INVOICE_FINANCE_PERMS);
    $uni = University::factory()->create();
    $scholarship = Scholarship::factory()->create([
        'university_id' => $uni->id, 'tuition_after' => 10000, 'hostel_after' => 0,
    ]);
    $program = Program::factory()->for($uni)->create([
        'tuition_fee' => 40000, 'hostel_fee' => 6000, 'currency' => 'CNY',
        'service_charges' => ['currency' => 'CNY', 'scholarships' => [
            ['scholarship_id' => $scholarship->id, 'student' => 800, 'agent' => 600],
        ]],
    ]);
    $application = Application::factory()->create([
        'university_id' => $uni->id, 'program_id' => $program->id, 'scholarship_id' => $scholarship->id,
    ]);

    $lines = collect(
        $this->getJson("/api/v1/invoices/fee-schedule?application_id={$application->id}")->assertOk()->json('data.lines')
    );

    expect($lines->firstWhere('fee_type', 'tuition')['unit_price'])->toEqual(10000) // after scholarship
        ->and($lines->firstWhere('fee_type', 'hostel'))->toBeNull()                 // hostel_after 0 → omitted
        ->and($lines->firstWhere('fee_type', 'service_charge')['unit_price'])->toEqual(800);
});

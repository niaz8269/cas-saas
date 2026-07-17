<?php

use App\Models\Application;
use App\Models\Commission;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('denies the dashboard without a dashboard.view grant', function () {
    actingAsStaffWith([]);

    $this->getJson('/api/v1/dashboards/executive')->assertForbidden();
});

it('returns global aggregates for a management viewer', function () {
    actingAsStaffWith(['dashboard.view.global', 'leads.view.global', 'students.view.global', 'applications.view.global', 'commission.view.global', 'finance.view.global', 'visa.view.global']);

    // Leads do not cascade other records — exact totals are safe here.
    Lead::factory()->count(3)->create(['status' => 'new']);
    Lead::factory()->count(2)->create(['status' => 'converted']);
    // Distinctive statuses so factory-cascaded students/apps don't skew the
    // buckets we assert on.
    Student::factory()->count(4)->create(['status' => 'enrolled']);
    Application::factory()->count(2)->create(['status' => 'submitted']);
    Application::factory()->create(['status' => 'accepted']);
    Commission::factory()->create(['status' => 'expected', 'expected_amount' => 3400, 'received_amount' => 0]);
    Commission::factory()->create(['status' => 'received', 'expected_amount' => 8000, 'received_amount' => 8000]);

    $this->getJson('/api/v1/dashboards/executive')
        ->assertOk()
        ->assertJsonPath('data.leads.total', 5)
        ->assertJsonPath('data.leads.by_status.converted', 2)
        ->assertJsonPath('data.leads.conversion_rate', 40)
        ->assertJsonPath('data.students.by_status.enrolled', 4)
        ->assertJsonPath('data.applications.by_status.submitted', 2)
        ->assertJsonPath('data.applications.by_status.accepted', 1)
        ->assertJsonPath('data.commissions.pipeline.received.count', 1)
        ->assertJsonPath('data.commissions.received_total', 8000)
        ->assertJsonPath('data.commissions.expected_total', 11400);
});

it('scopes finance receivables to student invoices', function () {
    actingAsStaffWith(['dashboard.view.global', 'applications.view.global', 'finance.view.global']);

    $application = Application::factory()->create();
    Invoice::factory()->create([
        'party_type' => 'student', 'party_id' => $application->student_id,
        'application_id' => $application->id, 'total' => 30000, 'amount_paid' => 12000,
    ]);
    // University (commission) invoices are excluded from receivables.
    Invoice::factory()->create(['party_type' => 'university', 'total' => 8000, 'amount_paid' => 0]);

    $this->getJson('/api/v1/dashboards/executive')
        ->assertOk()
        ->assertJsonPath('data.finance.billed', 30000)
        ->assertJsonPath('data.finance.collected', 12000)
        ->assertJsonPath('data.finance.receivables', 18000);
});

it('narrows aggregates to a counselors own book', function () {
    $counselor = actingAsStaffWith(['dashboard.view.assigned', 'students.view.assigned', 'leads.view.assigned', 'applications.view.assigned', 'commission.view.own']);

    // The counselor's own students + someone else's.
    Student::factory()->count(2)->create(['assigned_counselor_id' => $counselor->id, 'status' => 'active']);
    Student::factory()->count(5)->create(['status' => 'active']);

    $this->getJson('/api/v1/dashboards/executive')
        ->assertOk()
        ->assertJsonPath('data.students.total', 2);
});

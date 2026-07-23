<?php

use App\Models\Application;
use App\Models\Communication;
use App\Models\Document;
use App\Models\Student;
use App\Models\User;
use App\Models\VisaCase;
use App\Services\Admissions\ApplicationWorkflow;
use App\Services\Visa\VisaWorkflow;
use Database\Seeders\AutomationRuleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

/*
 * The applicant must hear about every milestone that needs them to act —
 * above all a rejected document (otherwise they're stranded with no signal
 * to re-upload). These ride the declarative comms engine + seeded rules;
 * we assert the durable Communication row is queued for the right student.
 */

beforeEach(function () {
    Queue::fake();
    $this->seed(AutomationRuleSeeder::class);
});

it('emails the student to re-upload when a document is rejected', function () {
    actingAsStaffWith(['documents.view.global', 'documents.verify.global']);
    $document = Document::factory()->create(); // Application-attached → has a student

    $this->postJson("/api/v1/documents/{$document->id}/reject")->assertOk();

    $studentId = Application::find($document->documentable_id)->student_id;
    $comm = Communication::where('student_id', $studentId)->where('template', 'document_rejected')->first();
    expect($comm)->not->toBeNull()
        ->and($comm->channel)->toBe('email');
});

it('emails the student when a document is verified', function () {
    actingAsStaffWith(['documents.view.global', 'documents.verify.global']);
    $document = Document::factory()->create();

    $this->postJson("/api/v1/documents/{$document->id}/verify")->assertOk();

    $studentId = Application::find($document->documentable_id)->student_id;
    expect(Communication::where('student_id', $studentId)->where('template', 'document_verified')->exists())
        ->toBeTrue();
});

it('emails the student when documents are requested (documents_pending)', function () {
    $application = Application::factory()->create(['status' => 'under_review']);

    app(ApplicationWorkflow::class)->transition($application, 'documents_pending', User::factory()->create());

    expect(Communication::where('student_id', $application->student_id)->where('template', 'documents_requested')->exists())
        ->toBeTrue();
});

it('emails the student when their application is rejected', function () {
    $application = Application::factory()->create(['status' => 'submitted']);

    app(ApplicationWorkflow::class)->transition($application, 'rejected', User::factory()->create());

    expect(Communication::where('student_id', $application->student_id)->where('template', 'application_rejected')->exists())
        ->toBeTrue();
});

it('emails the student when their offer is accepted', function () {
    $application = Application::factory()->create(['status' => 'offer_received']);

    app(ApplicationWorkflow::class)->transition($application, 'accepted', User::factory()->create());

    expect(Communication::where('student_id', $application->student_id)->where('template', 'offer_accepted')->exists())
        ->toBeTrue();
});

it('emails the student when their visa is not approved', function () {
    $case = VisaCase::factory()->create(['status' => 'submitted']);

    app(VisaWorkflow::class)->transition($case, 'rejected', User::factory()->create(), 'Missing bank guarantee');

    expect(Communication::where('student_id', $case->student_id)->where('template', 'visa_rejected')->exists())
        ->toBeTrue();
});

<?php

use App\Models\Application;
use App\Models\DocumentType;
use App\Models\Notification;
use App\Models\User;
use App\Models\VisaCase;
use App\Services\Admissions\ApplicationWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

/*
 * Lifecycle handoffs must alert the next desk, not just mutate records:
 * acceptance hands off to Finance + Visa, submission tells the counselor,
 * a manual visa assignment tells the officer, and a portal document upload
 * tells the assigned admissions officer. (Offer-decline routing is left as
 * a product decision — see OfferResponseApiTest, which pins current behavior.)
 */

/** A staff user holding visa.manage.global directly (an eligible visa officer). */
function visaOfficer(): User
{
    Permission::findOrCreate('visa.manage.global', 'staff');
    $officer = User::factory()->create();
    $officer->givePermissionTo('visa.manage.global');

    return $officer;
}

it('assigns a fresh visa case to the least-loaded officer and notifies them on acceptance', function () {
    $officer = visaOfficer();
    $application = Application::factory()->create(['status' => 'offer_received']);

    app(ApplicationWorkflow::class)->transition($application, 'accepted', User::factory()->create());

    $case = VisaCase::where('application_id', $application->id)->first();

    expect($case->assigned_visa_officer_id)->toBe($officer->id);
    expect(Notification::where('user_id', $officer->id)
        ->where('type', 'visa.opened')
        ->where('entity_type', 'visa_case')
        ->where('entity_id', $case->id)
        ->exists())->toBeTrue();
});

it('notifies the Finance desk that an invoice & commission are ready on acceptance', function () {
    Role::findOrCreate('Finance', 'staff');
    $finance = User::factory()->create();
    $finance->assignRole('Finance');

    $application = Application::factory()->create(['status' => 'offer_received']);
    app(ApplicationWorkflow::class)->transition($application, 'accepted', User::factory()->create());

    expect(Notification::where('user_id', $finance->id)
        ->where('type', 'application.accepted')
        ->where('entity_id', $application->id)
        ->exists())->toBeTrue();
});

it('notifies the counselor when an application is submitted to the university', function () {
    $counselor = User::factory()->create();
    $application = Application::factory()->create(['status' => 'under_review']);
    $application->student->update(['assigned_counselor_id' => $counselor->id]);

    app(ApplicationWorkflow::class)->transition($application, 'submitted', User::factory()->create());

    expect(Notification::where('user_id', $counselor->id)
        ->where('type', 'application.submitted')
        ->where('entity_id', $application->id)
        ->exists())->toBeTrue();
});

it('notifies the officer when a visa case is manually assigned to them', function () {
    Permission::findOrCreate('visa.manage.global', 'staff');
    $actor = actingAsStaffWith(['visa.view.global', 'visa.manage.global']);
    $officer = visaOfficer();
    $case = VisaCase::factory()->create();

    $this->postJson("/api/v1/visa-cases/{$case->id}/assign", ['user_id' => $officer->id])
        ->assertOk();

    expect($case->fresh()->assigned_visa_officer_id)->toBe($officer->id);
    expect(Notification::where('user_id', $officer->id)
        ->where('type', 'visa.assigned')
        ->where('entity_id', $case->id)
        ->exists())->toBeTrue();
});

it('does not notify when a visa officer assigns a case to themselves', function () {
    $actor = actingAsStaffWith(['visa.view.global', 'visa.manage.global']);
    $case = VisaCase::factory()->create();

    $this->postJson("/api/v1/visa-cases/{$case->id}/assign", ['user_id' => $actor->id])
        ->assertOk();

    expect(Notification::where('user_id', $actor->id)->where('type', 'visa.assigned')->exists())
        ->toBeFalse();
});

it('notifies the assigned admissions officer when a student uploads a document', function () {
    $officer = User::factory()->create();
    $student = actingAsStudentPortal();
    Application::factory()->create([
        'student_id' => $student->id,
        'status' => 'under_review',
        'assigned_admissions_id' => $officer->id,
    ]);

    $passport = DocumentType::factory()->create(['name' => 'Passport']);

    $this->postJson('/api/v1/student/documents', [
        'document_type_id' => $passport->id,
        'key' => "students/{$student->id}/passport.jpg",
        'file_name' => 'passport.jpg',
        'mime' => 'image/jpeg',
        'size' => 1000,
    ])->assertCreated();

    expect(Notification::where('user_id', $officer->id)
        ->where('type', 'document.uploaded')
        ->where('entity_type', 'student')
        ->where('entity_id', $student->id)
        ->exists())->toBeTrue();
});
